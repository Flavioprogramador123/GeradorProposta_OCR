#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SISTEMA DE TEMPLATES DINÂMICOS PIENG
====================================

Sistema para geração automática de propostas baseado em templates
que se adaptam automaticamente ao perfil do cliente e tipo de orçamento.

Autor: Sistema PIENG
Data: 26/01/2025
"""

import json
import yaml
import os
from datetime import datetime
from typing import Dict, List, Any, Tuple
import math

class TemplateEngine:
    def __init__(self):
        self.templates = {
            'residencial': {
                'banner_urgencia': '⚡ OPORTUNIDADE EXCLUSIVA: PAYBACK EXCEPCIONAL DE APENAS {payback} MESES! ⚡',
                'insights': [
                    '💰 Melhor Investimento',
                    '⚡ Economia Garantida', 
                    '🌱 Sustentabilidade',
                    '📈 Valorização do Imóvel'
                ],
                'cta_buttons': [
                    {'icon': '📱', 'title': 'WhatsApp', 'subtitle': 'Resposta imediata', 'url': 'https://wa.me/5562991670536'},
                    {'icon': '📞', 'title': 'Ligar Agora', 'subtitle': '(62) 99167-0536', 'url': 'tel:+5562991670536'},
                    {'icon': '✉️', 'title': 'E-mail', 'subtitle': 'contato@piengsolucoes.com.br', 'url': 'mailto:contato@piengsolucoes.com.br'}
                ]
            },
            'comercial': {
                'banner_urgencia': '💼 OPORTUNIDADE COMERCIAL: REDUZA CUSTOS OPERACIONAIS COM PAYBACK DE {payback} MESES! 💼',
                'insights': [
                    '💼 Redução de Custos',
                    '📊 ROI Garantido',
                    '🌱 Responsabilidade Social',
                    '🏢 Valorização do Negócio'
                ],
                'cta_buttons': [
                    {'icon': '📱', 'title': 'WhatsApp', 'subtitle': 'Consultoria especializada', 'url': 'https://wa.me/5562991670536'},
                    {'icon': '📞', 'title': 'Ligar Agora', 'subtitle': '(62) 99167-0536', 'url': 'tel:+5562991670536'},
                    {'icon': '✉️', 'title': 'E-mail', 'subtitle': 'comercial@piengsolucoes.com.br', 'url': 'mailto:comercial@piengsolucoes.com.br'}
                ]
            },
            'industrial': {
                'banner_urgencia': '🏭 SOLUÇÃO INDUSTRIAL: MAXIMIZE SUA PRODUTIVIDADE COM PAYBACK DE {payback} MESES! 🏭',
                'insights': [
                    '🏭 Eficiência Industrial',
                    '⚡ Energia Contínua',
                    '🌱 Sustentabilidade Corporativa',
                    '📈 Competitividade de Mercado'
                ],
                'cta_buttons': [
                    {'icon': '📱', 'title': 'WhatsApp', 'subtitle': 'Projeto industrial', 'url': 'https://wa.me/5562991670536'},
                    {'icon': '📞', 'title': 'Ligar Agora', 'subtitle': '(62) 99167-0536', 'url': 'tel:+5562991670536'},
                    {'icon': '✉️', 'title': 'E-mail', 'subtitle': 'industrial@piengsolucoes.com.br', 'url': 'mailto:industrial@piengsolucoes.com.br'}
                ]
            },
            'rural': {
                'banner_urgencia': '🚜 ENERGIA RURAL: MODERNIZE SUA PROPRIEDADE COM PAYBACK DE {payback} MESES! 🚜',
                'insights': [
                    '🚜 Modernização Rural',
                    '⚡ Energia Confiável',
                    '🌱 Sustentabilidade Agrícola',
                    '📈 Produtividade no Campo'
                ],
                'cta_buttons': [
                    {'icon': '📱', 'title': 'WhatsApp', 'subtitle': 'Soluções rurais', 'url': 'https://wa.me/5562991670536'},
                    {'icon': '📞', 'title': 'Ligar Agora', 'subtitle': '(62) 99167-0536', 'url': 'tel:+5562991670536'},
                    {'icon': '✉️', 'title': 'E-mail', 'subtitle': 'rural@piengsolucoes.com.br', 'url': 'mailto:rural@piengsolucoes.com.br'}
                ]
            }
        }
    
    def get_template(self, tipo_cliente: str) -> Dict:
        """Retorna template baseado no tipo de cliente"""
        return self.templates.get(tipo_cliente.lower(), self.templates['residencial'])
    
    def personalizar_banner(self, template: Dict, payback: float) -> str:
        """Personaliza banner com payback específico"""
        return template['banner_urgencia'].format(payback=f"{payback:.1f}")
    
    def personalizar_insights(self, template: Dict, dados_cliente: Dict, melhor_sistema: Dict) -> List[Dict]:
        """Personaliza insights baseado no perfil do cliente"""
        insights = []
        
        for insight_titulo in template['insights']:
            if 'Melhor Investimento' in insight_titulo:
                insights.append({
                    'titulo': insight_titulo,
                    'descricao': f"<strong>{melhor_sistema.get('titulo', 'Sistema Recomendado')}</strong> oferece o melhor custo-benefício com payback de apenas <strong>{melhor_sistema['payback_meses']:.1f} meses</strong> e TIR de <strong>{melhor_sistema['tir_anual']:.1f}%</strong> ao ano."
                })
            elif 'Economia' in insight_titulo or 'Redução' in insight_titulo:
                insights.append({
                    'titulo': insight_titulo,
                    'descricao': f"Com o sistema recomendado, você economizará aproximadamente <strong>R$ {melhor_sistema['economia_mensal']:,.2f}/mês</strong> na conta de energia, totalizando <strong>R$ {melhor_sistema['economia_mensal'] * 12:,.2f}/ano</strong>."
                })
            elif 'Sustentabilidade' in insight_titulo:
                co2_evitado = (melhor_sistema['geracao_mensal'] * 12 * 25 * 0.5) / 1000  # Estimativa
                insights.append({
                    'titulo': insight_titulo,
                    'descricao': f"Em 25 anos, você evitará a emissão de <strong>{co2_evitado:.0f} toneladas de CO₂</strong>, contribuindo para um futuro mais sustentável."
                })
            elif 'Valorização' in insight_titulo or 'Competitividade' in insight_titulo or 'Produtividade' in insight_titulo:
                valorizacao = melhor_sistema['pix'] * 0.08  # 8% de valorização
                insights.append({
                    'titulo': insight_titulo,
                    'descricao': f"Estudos indicam que imóveis com energia solar se valorizam em até <strong>8%</strong>, representando um ganho adicional de <strong>R$ {valorizacao:,.2f}</strong>."
                })
            else:
                insights.append({
                    'titulo': insight_titulo,
                    'descricao': f"Benefício específico para {dados_cliente['tipo']} com sistema solar de alta performance."
                })
        
        return insights

class SistemaPIENGCompleto:
    def __init__(self):
        self.template_engine = TemplateEngine()
        self.config = {
            'pdespesa_fixo_padrao': 7200.00,
            'pdespesa_variavel_padrao': 0.78,
            'performance_rate': 0.75,
            'dias_mes': 30.4,
            'tarifa_padrao': 0.982,
            'hsp_padrao': 5.21,
            'consumo_padrao': 800
        }
    
    def calcular_precos(self, pcusto: float, pdespesa: float) -> Dict[str, float]:
        """Calcula todos os preços comerciais"""
        ppix = pcusto + pdespesa
        pavista = ppix / 0.9
        priscado = ppix * 1.20
        p12x = pavista / 12
        p18x_total = ppix / 0.845
        p18x_parcela = p18x_total / 18
        
        return {
            'pix': ppix,
            'avista': pavista,
            'priscado': priscado,
            'parcela_12x': p12x,
            'parcela_18x': p18x_parcela,
            'total_18x': p18x_total
        }
    
    def calcular_performance(self, potencia_kw: float, hsp: float, consumo_mensal: float, 
                           tarifa: float, investimento_pix: float) -> Dict[str, float]:
        """Calcula métricas de performance do sistema"""
        geracao_mensal = potencia_kw * hsp * self.config['dias_mes'] * self.config['performance_rate']
        cobertura = (geracao_mensal / consumo_mensal) * 100
        economia_mensal = geracao_mensal * tarifa
        payback_meses = investimento_pix / economia_mensal
        tir_anual = (12 / payback_meses) * 100
        
        return {
            'geracao_mensal': geracao_mensal,
            'cobertura': cobertura,
            'economia_mensal': economia_mensal,
            'payback_meses': payback_meses,
            'tir_anual': tir_anual
        }
    
    def processar_orcamentos(self, orcamentos: List[Dict], metodo_pdespesa: str = 'variavel') -> List[Dict]:
        """Processa lista de orçamentos com método de Pdespesa especificado"""
        resultados = []
        
        for orc in orcamentos:
            # Calcular potência total
            pot_total = (orc['modulos'] * orc['pot_modulo']) / 1000
            
            # Calcular Pdespesa baseado no método
            if metodo_pdespesa == 'fixo':
                pdespesa = self.config['pdespesa_fixo_padrao']
            else:  # variável
                pdespesa = orc['pcusto'] * self.config['pdespesa_variavel_padrao']
            
            # Calcular preços
            precos = self.calcular_precos(orc['pcusto'], pdespesa)
            
            # Calcular performance
            performance = self.calcular_performance(
                pot_total, 
                self.config['hsp_padrao'], 
                self.config['consumo_padrao'],
                self.config['tarifa_padrao'], 
                precos['pix']
            )
            
            # Consolidar dados
            resultado = {
                'nome': orc['nome'],
                'pot_total': pot_total,
                'pcusto': orc['pcusto'],
                'pdespesa': pdespesa,
                'modulos': orc['modulos'],
                'pot_modulo': orc['pot_modulo'],
                'inversores': orc['inversores'],
                'pot_inv': orc['pot_inv'],
                **precos,
                **performance
            }
            
            resultados.append(resultado)
        
        # Ordenar por melhor custo-benefício (menor PIX)
        resultados.sort(key=lambda x: x['pix'])
        
        return resultados
    
    def aplicar_pnl_estrategias(self, resultados: List[Dict], tipo_cliente: str) -> List[Dict]:
        """Aplica estratégias PNL baseadas no tipo de cliente"""
        
        # Estratégias específicas por tipo de cliente
        estrategias_por_tipo = {
            'residencial': [
                {'titulo': 'Sistema Econômico', 'badge': '🥇 MELHOR CUSTO/BENEFÍCIO', 'estrategia': 'ancoragem', 'recomendado': True},
                {'titulo': 'Sistema Intermediário', 'badge': '⚖️ EQUILÍBRIO PERFEITO', 'estrategia': 'decoy_effect', 'recomendado': False},
                {'titulo': 'Sistema Standard', 'badge': '⚡ TECNOLOGIA AVANÇADA', 'estrategia': 'social_proof', 'recomendado': False},
                {'titulo': 'Sistema Premium', 'badge': '👑 ALTA PERFORMANCE', 'estrategia': 'urgencia', 'recomendado': False},
                {'titulo': 'Sistema Luxo', 'badge': '💎 MÁXIMA QUALIDADE', 'estrategia': 'autoridade', 'recomendado': False}
            ],
            'comercial': [
                {'titulo': 'Sistema Empresarial', 'badge': '💼 MELHOR ROI', 'estrategia': 'ancoragem', 'recomendado': True},
                {'titulo': 'Sistema Intermediário', 'badge': '⚖️ EQUILÍBRIO CUSTO-BENEFÍCIO', 'estrategia': 'decoy_effect', 'recomendado': False},
                {'titulo': 'Sistema Avançado', 'badge': '⚡ TECNOLOGIA PREMIUM', 'estrategia': 'social_proof', 'recomendado': False},
                {'titulo': 'Sistema Corporativo', 'badge': '🏢 SOLUÇÃO COMPLETA', 'estrategia': 'urgencia', 'recomendado': False},
                {'titulo': 'Sistema Executivo', 'badge': '👔 MÁXIMA EFICIÊNCIA', 'estrategia': 'autoridade', 'recomendado': False}
            ],
            'industrial': [
                {'titulo': 'Sistema Industrial', 'badge': '🏭 MELHOR PRODUTIVIDADE', 'estrategia': 'ancoragem', 'recomendado': True},
                {'titulo': 'Sistema Intermediário', 'badge': '⚖️ EQUILÍBRIO OPERACIONAL', 'estrategia': 'decoy_effect', 'recomendado': False},
                {'titulo': 'Sistema Avançado', 'badge': '⚡ TECNOLOGIA INDUSTRIAL', 'estrategia': 'social_proof', 'recomendado': False},
                {'titulo': 'Sistema Premium', 'badge': '🏭 MÁXIMA EFICIÊNCIA', 'estrategia': 'urgencia', 'recomendado': False},
                {'titulo': 'Sistema Executivo', 'badge': '👔 SOLUÇÃO COMPLETA', 'estrategia': 'autoridade', 'recomendado': False}
            ],
            'rural': [
                {'titulo': 'Sistema Rural', 'badge': '🚜 MELHOR PARA O CAMPO', 'estrategia': 'ancoragem', 'recomendado': True},
                {'titulo': 'Sistema Intermediário', 'badge': '⚖️ EQUILÍBRIO RURAL', 'estrategia': 'decoy_effect', 'recomendado': False},
                {'titulo': 'Sistema Avançado', 'badge': '⚡ TECNOLOGIA RURAL', 'estrategia': 'social_proof', 'recomendado': False},
                {'titulo': 'Sistema Premium', 'badge': '🌾 MÁXIMA PRODUTIVIDADE', 'estrategia': 'urgencia', 'recomendado': False},
                {'titulo': 'Sistema Executivo', 'badge': '👨‍🌾 SOLUÇÃO COMPLETA', 'estrategia': 'autoridade', 'recomendado': False}
            ]
        }
        
        estrategias = estrategias_por_tipo.get(tipo_cliente.lower(), estrategias_por_tipo['residencial'])
        
        for i, resultado in enumerate(resultados[:5]):  # Máximo 5 propostas
            if i < len(estrategias):
                resultado.update(estrategias[i])
        
        return resultados
    
    def gerar_html_proposta(self, cliente: Dict, resultados: List[Dict], metodo_pdespesa: str) -> str:
        """Gera HTML da proposta com formatação consagrada e personalização por tipo de cliente"""
        
        # Obter template baseado no tipo de cliente
        template = self.template_engine.get_template(cliente['tipo'])
        
        # Encontrar melhor sistema para banner
        melhor_sistema = min(resultados, key=lambda x: x['payback_meses'])
        
        # Personalizar banner
        banner_urgencia = self.template_engine.personalizar_banner(template, melhor_sistema['payback_meses'])
        
        # Personalizar insights
        insights = self.template_engine.personalizar_insights(template, cliente, melhor_sistema)
        
        # Gerar HTML base (simplificado para demonstração)
        html_template = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PIENG | Proposta Solar Personalizada - {cliente['nome']} - {cliente['cidade']}</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><defs><linearGradient id='piengGradient' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' style='stop-color:%233366CC;stop-opacity:1' /><stop offset='100%' style='stop-color:%23FF6B35;stop-opacity:1' /></linearGradient></defs><circle cx='16' cy='16' r='15' fill='url(%23piengGradient)' stroke='%23ffffff' stroke-width='1'/><circle cx='16' cy='16' r='12' fill='none' stroke='rgba(0,0,0,0.1)' stroke-width='1'/><text x='16' y='22' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-size='18' font-weight='900' text-shadow='0 1px 2px rgba(0,0,0,0.3)'>P</text><ellipse cx='16' cy='8' rx='8' ry='3' fill='rgba(255,255,255,0.2)'/></svg>" type="image/svg+xml">
    <!-- CSS será incluído aqui -->
</head>
<body>
    <div class="container">
        <!-- HEADER -->
        <header class="header">
            <div class="pieng-logo-css">
                <div class="logo-circle">
                    <div class="logo-pi">PI</div>
                </div>
                <div class="logo-text">PIENG</div>
            </div>
            <div class="company-name">Soluções Energéticas</div>
            <div class="company-slogan">35+ anos de experiência em energia solar</div>
            <div class="client-info">
                <h3>Dados do Cliente</h3>
                <div class="client-grid">
                    <div class="client-item"><strong>Nome:</strong> {cliente['nome']}</div>
                    <div class="client-item"><strong>Cidade:</strong> {cliente['cidade']}</div>
                    <div class="client-item"><strong>Consumo:</strong> {cliente['consumo']} kWh/mês</div>
                    <div class="client-item"><strong>Tipo:</strong> {cliente['tipo']}</div>
                    <div class="client-item"><strong>HSP Local:</strong> {cliente['hsp']}</div>
                    <div class="client-item"><strong>Tarifa:</strong> R$ {cliente['tarifa']}/kWh</div>
                </div>
            </div>
        </header>

        <!-- BANNER DE URGÊNCIA PERSONALIZADO -->
        <div class="urgency-banner">
            {banner_urgencia}
        </div>

        <!-- SISTEMAS PROPOSTOS -->
        <div class="systems-grid">"""
        
        # Gerar cards dos sistemas com estratégias PNL
        for i, sistema in enumerate(resultados[:5], 1):
            recomendado_class = "recommended" if sistema.get('recomendado', False) else ""
            badge_html = f'<div class="card-badge">{sistema.get("badge", "")}</div>' if sistema.get('badge') else ""
            
            html_template += f"""
            <!-- SISTEMA {i} -->
            <div class="system-card {recomendado_class}">
                {badge_html}
                <div class="card-header">
                    <div class="card-title">{sistema.get('titulo', f'SISTEMA {i}')}</div>
                    <div class="card-power">Potência: {sistema['pot_total']:.2f} kWp</div>
                </div>
                <div class="card-body">
                    <ul class="specs-list">
                        <li>{sistema['modulos']}× {sistema['pot_modulo']}W Monocristalino</li>
                        <li>{sistema['inversores']}× {sistema['pot_inv']}KW</li>
                        <li>Estrutura: Fibrocimento</li>
                        <li>Geração: {sistema['geracao_mensal']:.0f} kWh/mês</li>
                        <li>Cobertura: {sistema['cobertura']:.0f}%</li>
                    </ul>

                    <div class="pricing-section">
                        <div class="original-price">De R$ {sistema['priscado']:,.2f}</div>
                        <div class="final-price">
                            À vista: R$ {sistema['avista']:,.2f}
                            <span class="discount-tag">-10% PIX</span>
                        </div>
                        <div><strong>PIX: R$ {sistema['pix']:,.2f}</strong></div>
                        
                        <div class="payment-options">
                            <div class="payment-option {'pix-highlight' if sistema.get('recomendado', False) else ''}">
                                <strong>12× sem juros</strong><br>
                                R$ {sistema['parcela_12x']:,.2f}/mês
                            </div>
                            <div class="payment-option">
                                <strong>18× cartão</strong><br>
                                R$ {sistema['parcela_18x']:,.2f}/mês
                            </div>
                        </div>
                    </div>

                    <div class="performance-box">
                        <strong>Performance Mensal</strong><br>
                        Geração: {sistema['geracao_mensal']:.0f} kWh/mês | Cobertura: {sistema['cobertura']:.0f}%<br>
                        Economia: R$ {sistema['economia_mensal']:,.2f}/mês | Payback: {sistema['payback_meses']:.1f} meses<br>
                        TIR: {sistema['tir_anual']:.1f}% ao ano
                    </div>

                    <button class="cta-button">ESCOLHER ESTA OPÇÃO</button>
                </div>
            </div>"""
        
        # Continuar com insights personalizados
        html_template += f"""
        </div>

        <!-- INSIGHTS ESTRATÉGICOS PERSONALIZADOS -->
        <section class="insights-section">
            <h3>Análise Estratégica para {cliente['tipo']}</h3>
            <div class="insights-grid">"""
        
        for insight in insights:
            html_template += f"""
                <div class="insight-card">
                    <h3>{insight['titulo']}</h3>
                    <p>{insight['descricao']}</p>
                </div>"""
        
        # Finalizar com CTAs personalizados
        html_template += f"""
            </div>
        </section>

        <!-- CALL TO ACTION PERSONALIZADO -->
        <section class="cta-section">
            <h2>Próximos Passos</h2>
            <p>Transforme sua relação com a energia elétrica hoje mesmo!</p>
            <div class="cta-buttons">"""
        
        for cta in template['cta_buttons']:
            html_template += f"""
                <a href="{cta['url']}" class="cta-button-external">
                    <span>{cta['icon']}</span><br>
                    <strong>{cta['title']}</strong><br>
                    {cta['subtitle']}
                </a>"""
        
        html_template += f"""
            </div>
        </section>

        <!-- FOOTER -->
        <footer class="footer">
            <div class="footer-content">
                <div class="footer-section">
                    <h3>PIENG Soluções Energéticas</h3>
                    <p>35+ anos de experiência em energia solar</p>
                    <p>Especialistas em sistemas elétricos de potência</p>
                </div>
                <div class="footer-section">
                    <h3>Contatos</h3>
                    <p>📞 (62) 99167-0536</p>
                    <p>✉️ contato@piengsolucoes.com.br</p>
                    <p>🌐 www.piengsolucoes.com.br</p>
                </div>
                <div class="footer-section">
                    <h3>Certificações</h3>
                    <p>✅ INMETRO</p>
                    <p>✅ Projeto aprovado pela concessionária</p>
                    <p>✅ Conformidade ANEEL</p>
                </div>
            </div>
            <div class="footer-disclaimer">
                <p><strong>Disclaimers Técnicos:</strong></p>
                <p>• Performance Rate: 75% conforme padrões da indústria • Base legal: Lei 14.300/2022 sobre TUSD</p>
                <p>• HSP {cliente['cidade']}: {cliente['hsp']} (fonte: CRESESB/INPE) • Economia considerando tarifa R$ {cliente['tarifa']}/kWh</p>
                <p>• Pdespesa: {'R$ ' + str(self.config['pdespesa_fixo_padrao']) + ',00 fixo' if metodo_pdespesa == 'fixo' else str(int(self.config['pdespesa_variavel_padrao'] * 100)) + '% do Pcusto'} • Valores válidos até {datetime.now().strftime('%d/%m/%Y')}</p>
                <p><em>Proposta gerada em {datetime.now().strftime('%d/%m/%Y')} • Válida por 7 dias • Sujeita à análise técnica do local</em></p>
            </div>
        </footer>
    </div>
</body>
</html>"""
        
        return html_template
    
    def gerar_proposta_completa(self, cliente: Dict, orcamentos: List[Dict], metodo_pdespesa: str = 'variavel') -> str:
        """Gera proposta completa com todos os cálculos, formatação e personalização"""
        # Processar orçamentos
        resultados = self.processar_orcamentos(orcamentos, metodo_pdespesa)
        
        # Aplicar estratégias PNL baseadas no tipo de cliente
        resultados = self.aplicar_pnl_estrategias(resultados, cliente['tipo'])
        
        # Gerar HTML personalizado
        html_proposta = self.gerar_html_proposta(cliente, resultados, metodo_pdespesa)
        
        return html_proposta

# Exemplo de uso
if __name__ == "__main__":
    sistema = SistemaPIENGCompleto()
    
    # Dados do cliente
    cliente = {
        'nome': 'José Rubem',
        'cidade': 'Anápolis/GO',
        'consumo': 800,
        'tipo': 'Residencial',
        'hsp': 5.21,
        'tarifa': 0.982
    }
    
    # Dados dos orçamentos
    orcamentos = [
        {'nome': 'micro8', 'pcusto': 6667.05, 'modulos': 8, 'pot_modulo': 700, 'inversores': 2, 'pot_inv': 2.25},
        {'nome': 'SOLAR12', 'pcusto': 8066.04, 'modulos': 12, 'pot_modulo': 580, 'inversores': 1, 'pot_inv': 6},
        {'nome': 'WEB-004401048', 'pcusto': 8369.48, 'modulos': 8, 'pot_modulo': 700, 'inversores': 2, 'pot_inv': 2.25},
        {'nome': 'SOLAR10', 'pcusto': 9566.25, 'modulos': 12, 'pot_modulo': 700, 'inversores': 3, 'pot_inv': 2.25},
        {'nome': 'WEB-004401038', 'pcusto': 11974.97, 'modulos': 12, 'pot_modulo': 700, 'inversores': 3, 'pot_inv': 2.25}
    ]
    
    # Gerar proposta com Pdespesa variável
    proposta_variavel = sistema.gerar_proposta_completa(cliente, orcamentos, 'variavel')
    
    # Salvar arquivo
    with open('proposta_sistema_completo.html', 'w', encoding='utf-8') as f:
        f.write(proposta_variavel)
    
    print("✅ Sistema completo gerado com sucesso!")
    print("📁 Arquivo: proposta_sistema_completo.html")
    print("🎯 Sistema adapta automaticamente ao tipo de cliente!")
