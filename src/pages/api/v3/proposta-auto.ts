import type { NextApiRequest, NextApiResponse } from 'next';
import { getCalcParams, setCalcParams } from '@/modules/v3/calc/params';
import { montarPropostaAuto } from '@/modules/v3/calc/propostaAuto';
import { refreshDcAcLimitsFromAdmin } from '@/modules/v3/calc/dcAcLimitsConfig';
import { getDcAcLimits } from '@/modules/v3/calc/dcAcRatio';
import { resolveCdId } from '@/modules/v3/precos/repository';
import { loadSistemaConfigFlat } from '@/lib/sistemaConfig';
import { extrairDefaultsV3, mergeConfiguracoes } from '@/utils/configuracoes';
import { ensureV3CatalogHydrated } from '@/modules/v3';
import { refreshPotenciaMinimosFromAdmin } from '@/modules/v3/precos/potenciaMinimosConfig';

async function loadAdminDefaultsV3() {
  try {
    const flat = await loadSistemaConfigFlat();
    return extrairDefaultsV3(mergeConfiguracoes(flat));
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await ensureV3CatalogHydrated();
    await refreshDcAcLimitsFromAdmin();
    await refreshPotenciaMinimosFromAdmin();
    if (req.method === 'GET') {
      const params = getCalcParams();
      const admin = await loadAdminDefaultsV3();
      const dcAc = getDcAcLimits();
      // Admin tem prioridade sobre seed local do SQLite para campos comerciais/técnicos compartilhados
      const mergedParams = admin
        ? {
            ...params,
            hsp: admin.hsp,
            tarifa: admin.tarifa,
            performanceRate: admin.performanceRate,
            diasMes: admin.diasMes,
            bonusMicroPercent: admin.bonusMicroPercent,
            placasPorMicro: admin.placasPorMicro,
            descontoPix: admin.descontoPix,
            varianciaAlvoPct:
              admin.varianciaAlvoPct != null
                ? admin.varianciaAlvoPct
                : params.varianciaAlvoPct,
          }
        : params;

      return res.status(200).json({
        params: mergedParams,
        comercial_defaults: admin
          ? {
              pdespesaFixo: admin.pdespesaFixo,
              pdespesaVariavel: admin.pdespesaVariavel,
              fretePadrao: admin.fretePadrao,
              fatorParcelado: admin.fatorParcelado,
              estoqueMinimoSoolar: admin.estoqueMinimoSoolar,
              estoqueMinimoOutros: admin.estoqueMinimoOutros,
              dcAcMin: admin.dcAcMin,
              dcAcMax: admin.dcAcMax,
              dcAcTolPp: admin.dcAcTolPp,
              varianciaAlvoPct: admin.varianciaAlvoPct,
              moduloPotenciaMinW: admin.moduloPotenciaMinW,
              inversorPotenciaMinKw: admin.inversorPotenciaMinKw,
            }
          : null,
        dc_ac: dcAc,
        fonte_admin: Boolean(admin),
      });
    }

    if (req.method === 'PUT') {
      const params = setCalcParams(req.body || {});
      return res.status(200).json({ params });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const rawCdIds = Array.isArray(body.cdIds)
        ? body.cdIds
        : body.cdIds != null
          ? [body.cdIds]
          : [];
      const cdIdsParsed = rawCdIds
        .map((n: unknown) => resolveCdId(n as string | number))
        .filter((n: number | null): n is number => Boolean(n));
      const cdId =
        resolveCdId((body.cdId ?? body.cd ?? cdIdsParsed[0] ?? 3) as string | number) ||
        cdIdsParsed[0] ||
        null;
      if (!cdId) return res.status(400).json({ message: 'CD inválido' });
      const cdIds = cdIdsParsed.length
        ? Array.from(new Set([cdId, ...cdIdsParsed]))
        : [cdId];

      const admin = await loadAdminDefaultsV3();
      const modo = body.modo || 'geracao_mensal';
      const kits_manuais = Array.isArray(body.kits_manuais) ? body.kits_manuais : undefined;
      const maxAltRaw =
        body.maxAlternativas != null ? Number(body.maxAlternativas) : undefined;
      const maxAlternativas =
        maxAltRaw != null && Number.isFinite(maxAltRaw)
          ? Math.min(6, Math.max(1, Math.round(maxAltRaw)))
          : 6;
      const result = montarPropostaAuto({
        modo,
        geracao_mensal_kwh: body.geracao_mensal_kwh,
        geracao_mensal_min: body.geracao_mensal_min != null ? Number(body.geracao_mensal_min) : undefined,
        geracao_mensal_max: body.geracao_mensal_max != null ? Number(body.geracao_mensal_max) : undefined,
        potencia_kwp: body.potencia_kwp,
        consumo_mensal_kwh: body.consumo_mensal_kwh,
        consumo_mensal_min: body.consumo_mensal_min != null ? Number(body.consumo_mensal_min) : undefined,
        consumo_mensal_max: body.consumo_mensal_max != null ? Number(body.consumo_mensal_max) : undefined,
        cdId,
        cdIds,
        cliente_nome: body.cliente_nome || 'Cliente Premium',
        hsp: body.hsp != null ? Number(body.hsp) : admin?.hsp,
        tarifa: body.tarifa != null ? Number(body.tarifa) : admin?.tarifa,
        performanceRate:
          body.performanceRate != null ? Number(body.performanceRate) : admin?.performanceRate,
        maxAlternativas,
        varianciaAlvoPct:
          body.varianciaAlvoPct != null
            ? Number(body.varianciaAlvoPct)
            : admin?.varianciaAlvoPct,
        salvar: Boolean(body.salvar),
        frete: body.frete != null ? Number(body.frete) : admin?.fretePadrao ?? 0,
        kits_manuais,
        incluir_auto: body.incluir_auto !== false,
        incluir_micro: body.incluir_micro === true || body.incluir_micro === 'true',
        incluir_string: body.incluir_string === true || body.incluir_string === 'true',
        /** Default true se omitido — rede 220/380 exclui trifásico 220 */
        rede_220_380:
          body.rede_220_380 === undefined || body.rede_220_380 === null
            ? true
            : body.rede_220_380 === true || body.rede_220_380 === 'true',
        comercial: {
          pdespesaFixo:
            body.pdespesaFixo != null ? Number(body.pdespesaFixo) : admin?.pdespesaFixo,
          pdespesaVariavel:
            body.pdespesaVariavel != null
              ? Number(body.pdespesaVariavel)
              : admin?.pdespesaVariavel,
          fatorParcelado:
            body.fatorParcelado != null ? Number(body.fatorParcelado) : admin?.fatorParcelado,
          hsp: body.hsp != null ? Number(body.hsp) : admin?.hsp,
          tarifa: body.tarifa != null ? Number(body.tarifa) : admin?.tarifa,
        },
      });

      return res.status(200).json({ ok: true, ...result });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ message: e instanceof Error ? e.message : String(e) });
  }
}
