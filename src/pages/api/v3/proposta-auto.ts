import type { NextApiRequest, NextApiResponse } from 'next';
import { getCalcParams, setCalcParams } from '@/modules/v3/calc/params';
import { montarPropostaAuto } from '@/modules/v3/calc/propostaAuto';
import { resolveCdId } from '@/modules/v3/precos/repository';
import { loadSistemaConfigFlat } from '@/lib/sistemaConfig';
import { extrairDefaultsV3, mergeConfiguracoes } from '@/utils/configuracoes';
import { ensureV3CatalogHydrated } from '@/modules/v3';

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
    if (req.method === 'GET') {
      const params = getCalcParams();
      const admin = await loadAdminDefaultsV3();
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
            }
          : null,
        fonte_admin: Boolean(admin),
      });
    }

    if (req.method === 'PUT') {
      const params = setCalcParams(req.body || {});
      return res.status(200).json({ params });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const cdId = resolveCdId(body.cdId ?? body.cd ?? 3);
      if (!cdId) return res.status(400).json({ message: 'CD inválido' });

      const admin = await loadAdminDefaultsV3();
      const modo = body.modo || 'geracao_mensal';
      const kits_manuais = Array.isArray(body.kits_manuais) ? body.kits_manuais : undefined;
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
        cliente_nome: body.cliente_nome || 'Cliente Premium',
        hsp: body.hsp != null ? Number(body.hsp) : admin?.hsp,
        tarifa: body.tarifa != null ? Number(body.tarifa) : admin?.tarifa,
        performanceRate:
          body.performanceRate != null ? Number(body.performanceRate) : admin?.performanceRate,
        maxAlternativas: body.maxAlternativas != null ? Number(body.maxAlternativas) : undefined,
        salvar: Boolean(body.salvar),
        frete: body.frete != null ? Number(body.frete) : admin?.fretePadrao ?? 0,
        kits_manuais,
        incluir_auto: body.incluir_auto !== false,
        incluir_micro: body.incluir_micro === true || body.incluir_micro === 'true',
        incluir_string: body.incluir_string === true || body.incluir_string === 'true',
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
