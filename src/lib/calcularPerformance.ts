/**
 * Cálculo de geração e detecção micro-inversor vs string.
 * Micro-inversores costumam render ~5% a mais no mesmo HSP (configurável).
 */

export interface InversorEquipamento {
  modulos: number;
  inversores: number;
  pot_inv: number;
  marca_inversor?: string;
  bonusMicroAtivo?: boolean;
  bonusMicroManual?: boolean;
}

export function isMicroInversor(orc: InversorEquipamento): boolean {
  const marca = (orc.marca_inversor || '').toLowerCase().trim();
  if (!marca || marca === 'string') {
    // placeholder legado — inferir só por quantidade/potência
  } else {
    if (/micro/.test(marca)) return true;
    const marcasMicro = ['hoymiles', 'apsystems', 'enphase', 'tsun', 'deye', 'growatt ne'];
    if (marcasMicro.some((m) => marca.includes(m))) return true;
  }
  // 1 micro por ~2–4 módulos (ex.: 12 mód / 3×2.25 kW)
  if (orc.modulos > 0 && orc.inversores >= orc.modulos * 0.8) return true;
  if (orc.pot_inv > 0 && orc.pot_inv < 1) return true;
  // micros residenciais típicos ≤2.5 kW com vários aparelhos
  if (orc.pot_inv > 0 && orc.pot_inv <= 2.5 && orc.inversores >= 2) return true;
  return false;
}

export function getBonusMicroAtivo(orc: InversorEquipamento): boolean {
  if (typeof orc.bonusMicroAtivo === 'boolean') return orc.bonusMicroAtivo;
  return isMicroInversor(orc);
}

/** Reaplica detecção automática quando o usuário não definiu manualmente. */
export function syncBonusMicroAuto<T extends InversorEquipamento>(orc: T): T {
  if (orc.bonusMicroManual) return orc;
  return { ...orc, bonusMicroAtivo: isMicroInversor(orc) };
}

export function calcularGeracaoMensal(
  potenciaKw: number,
  hsp: number,
  performanceRate: number,
  bonusMicroAtivo = false,
  bonusMicroPercent = 5
): number {
  const fatorBonus = bonusMicroAtivo ? 1 + bonusMicroPercent / 100 : 1;
  return potenciaKw * hsp * 30.4 * performanceRate * fatorBonus;
}

export function calcularPerformanceCompleta(
  potenciaKw: number,
  hsp: number,
  performanceRate: number,
  consumoMensal: number,
  tarifa: number,
  investimentoPix: number,
  bonusMicroAtivo = false,
  bonusMicroPercent = 5
) {
  const geracaoMensal = calcularGeracaoMensal(
    potenciaKw,
    hsp,
    performanceRate,
    bonusMicroAtivo,
    bonusMicroPercent
  );
  const cobertura = consumoMensal > 0 ? (geracaoMensal / consumoMensal) * 100 : 0;
  const economiaMensal = geracaoMensal * tarifa;
  const paybackMeses = economiaMensal > 0 ? investimentoPix / economiaMensal : Infinity;
  const tirAnual =
    paybackMeses > 0 && paybackMeses !== Infinity ? (12 / paybackMeses) * 100 : 0;

  return { geracaoMensal, cobertura, economiaMensal, paybackMeses, tirAnual };
}
