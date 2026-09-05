export { getV3Db, getV3DbPath, V3_ENABLED, closeV3Db } from './db/sqlite';
export { getV3DataDir, getV3TempDir, isV3ServerlessFs } from './db/paths';
export * from './equipamentos/types';
export * from './equipamentos/repository';
export { seedEquipamentosFromYaml, resolveYamlSeedPath } from './equipamentos/seedFromYaml';
export * from './precos/repository';
export { matchCatalogItem, matchMany } from './precos/matcher';
export {
  parseProductsFromHtml,
  importHtmlFileToCd,
  importFeiraJsonToCd,
  applyCatalogToCd,
} from './precos/importCatalog';
export { atualizarPrecosV3, atualizarPrecosFromTemp, atualizarPrecosFromScrape } from './precos/capturaJob';
export { calcularOrcamentoBase, sugerirComplementos, estimarStringsInversor, listCatalogoComPreco } from './orcamentos/kitEngine';
export {
  listOrcamentosBase,
  getOrcamentoBase,
  createOrcamentoBase,
  deleteOrcamentoBase,
} from './orcamentos/repository';
export { getCalcParams, setCalcParams, geracaoFromKwp, kwpFromGeracao, precificarCusto } from './calc/params';
export { montarPropostaAuto } from './calc/propostaAuto';
