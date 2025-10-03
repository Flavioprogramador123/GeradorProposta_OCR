#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SISTEMA INTEGRADO PIENG - GERADOR DE PROPOSTAS SOLARES
======================================================

Sistema completo para geração automática de propostas solares com:
- Cálculo dinâmico de Pdespesa (fixo e variável)
- Geração automática de HTML com formatação consagrada
- Aplicação de técnicas PNL
- Adaptação automática por perfil de cliente
- Interface para consultor alterar parâmetros

Autor: Sistema PIENG
Data: 26/01/2025
"""

import json
import yaml
import os
from datetime import datetime
from typing import Dict, List, Any, Tuple
import math

class SistemaPIENG:
    def __init__(self):
        self.config = {
            'pdespesa_fixo_padrao': 7200.00,
            'pdespesa_variavel_padrao': 0.78,  # 78% do Pcusto
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
    
    def aplicar_pnl_estrategias(self, resultados: List[Dict]) -> List[Dict]:
        """Aplica estratégias PNL aos resultados"""
        estrategias = [
            {'titulo': 'Sistema Econômico', 'badge': '🥇 MELHOR CUSTO/BENEFÍCIO', 'estrategia': 'ancoragem', 'recomendado': True},
            {'titulo': 'Sistema Intermediário', 'badge': '⚖️ EQUILÍBRIO PERFEITO', 'estrategia': 'decoy_effect', 'recomendado': False},
            {'titulo': 'Sistema Standard', 'badge': '⚡ TECNOLOGIA AVANÇADA', 'estrategia': 'social_proof', 'recomendado': False},
            {'titulo': 'Sistema Premium', 'badge': '👑 ALTA PERFORMANCE', 'estrategia': 'urgencia', 'recomendado': False},
            {'titulo': 'Sistema Luxo', 'badge': '💎 MÁXIMA QUALIDADE', 'estrategia': 'autoridade', 'recomendado': False}
        ]
        
        for i, resultado in enumerate(resultados[:5]):  # Máximo 5 propostas
            if i < len(estrategias):
                resultado.update(estrategias[i])
        
        return resultados
    
    def gerar_html_proposta(self, cliente: Dict, resultados: List[Dict], metodo_pdespesa: str) -> str:
        """Gera HTML da proposta com formatação consagrada"""
        
        # Encontrar melhor sistema para banner
        melhor_sistema = min(resultados, key=lambda x: x['payback_meses'])
        
        html_template = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PIENG | Proposta Solar Personalizada - {cliente['nome']} - {cliente['cidade']}</title>
    <style>
        :root {{
            --primary: #3366CC;
            --secondary: #FF6B35;
            --success: #2ecc71;
            --danger: #e74c3c;
            --warning: #f39c12;
            --light: #f8f9fa;
            --dark: #343a40;
            --muted: #6c757d;
        }}

        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: var(--dark);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }}

        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }}

        .header {{
            background: white;
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
            position: relative;
        }}

        .pieng-logo-css {{
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 20px;
        }}

        .logo-circle {{
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: linear-gradient(135deg, #3366CC, #FF6B35);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 25px rgba(51, 102, 204, 0.3);
            margin-bottom: 10px;
            position: relative;
            overflow: hidden;
        }}

        .logo-circle::before {{
            content: '';
            position: absolute;
            top: 15%;
            left: 15%;
            width: 70%;
            height: 70%;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
        }}

        .logo-pi {{
            font-size: 48px;
            font-weight: 900;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            z-index: 1;
            position: relative;
        }}

        .logo-text {{
            font-size: 24px;
            font-weight: 900;
            color: var(--primary);
            letter-spacing: 3px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }}

        .company-name {{
            font-size: 24px;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 10px;
        }}

        .company-slogan {{
            font-size: 16px;
            color: var(--muted);
            margin-bottom: 20px;
        }}

        .client-info {{
            background: var(--light);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            text-align: left;
        }}

        .client-info h3 {{
            color: var(--primary);
            margin-bottom: 10px;
        }}

        .client-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }}

        .client-item {{
            font-size: 14px;
        }}

        .urgency-banner {{
            background: linear-gradient(135deg, var(--danger), #c0392b);
            color: white;
            padding: 15px;
            text-align: center;
            font-weight: 700;
            font-size: 18px;
            margin-bottom: 20px;
            border-radius: 10px;
            animation: pulse 2s infinite;
        }}

        @keyframes pulse {{
            0% {{ transform: scale(1); }}
            50% {{ transform: scale(1.02); }}
            100% {{ transform: scale(1); }}
        }}

        .systems-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}

        .system-card {{
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 30px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            position: relative;
        }}

        .system-card:hover {{
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.15);
        }}

        .system-card.recommended {{
            border: 3px solid var(--success);
            transform: scale(1.05);
        }}

        .card-badge {{
            position: absolute;
            top: 15px;
            right: 15px;
            background: var(--success);
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            z-index: 2;
            animation: glow 2s infinite alternate;
        }}

        @keyframes glow {{
            from {{ box-shadow: 0 0 10px var(--success); }}
            to {{ box-shadow: 0 0 20px var(--success), 0 0 30px var(--success); }}
        }}

        .card-header {{
            background: linear-gradient(135deg, var(--primary), #4f46e5);
            color: white;
            padding: 20px;
            text-align: center;
        }}

        .card-title {{
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 5px;
        }}

        .card-power {{
            font-size: 16px;
            opacity: 0.9;
        }}

        .card-body {{
            padding: 25px;
        }}

        .specs-list {{
            list-style: none;
            margin-bottom: 20px;
        }}

        .specs-list li {{
            padding: 5px 0;
            padding-left: 20px;
            position: relative;
        }}

        .specs-list li:before {{
            content: "✓";
            position: absolute;
            left: 0;
            color: var(--success);
            font-weight: bold;
        }}

        .pricing-section {{
            background: var(--light);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }}

        .original-price {{
            color: var(--danger);
            text-decoration: line-through;
            font-weight: 700;
            font-size: 14px;
        }}

        .final-price {{
            font-size: 24px;
            font-weight: 900;
            color: var(--dark);
            margin: 10px 0;
        }}

        .discount-tag {{
            display: inline-block;
            background: var(--success);
            color: white;
            padding: 4px 8px;
            border-radius: 15px;
            font-size: 10px;
            font-weight: 700;
            margin-left: 10px;
        }}

        .payment-options {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 15px;
        }}

        .payment-option {{
            background: white;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            font-size: 13px;
            border: 2px solid transparent;
        }}

        .payment-option.pix-highlight {{
            border-color: var(--success);
            background: rgba(46, 204, 113, 0.1);
        }}

        .performance-box {{
            background: linear-gradient(135deg, var(--primary), #4f46e5);
            color: white;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            font-size: 14px;
            margin: 15px 0;
        }}

        .cta-button {{
            width: 100%;
            background: linear-gradient(135deg, var(--success), #27ae60);
            color: white;
            border: none;
            padding: 15px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
        }}

        .cta-button:hover {{
            background: linear-gradient(135deg, #27ae60, var(--success));
            transform: translateY(-2px);
        }}

        .comparison-table {{
            background: white;
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.1);
        }}

        .comparison-table h3 {{
            color: var(--primary);
            margin-bottom: 20px;
            text-align: center;
        }}

        .table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }}

        .table th,
        .table td {{
            padding: 12px;
            text-align: center;
            border-bottom: 1px solid #eee;
        }}

        .table th {{
            background: var(--light);
            font-weight: 700;
            color: var(--primary);
        }}

        .table tr:hover {{
            background: rgba(51, 102, 204, 0.05);
        }}

        .recommended-row {{
            background: rgba(46, 204, 113, 0.1);
            font-weight: 700;
        }}

        .price-old {{
            color: var(--danger);
            text-decoration: line-through;
            font-size: 14px;
        }}

        .insights-section {{
            background: white;
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.1);
        }}

        .insights-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }}

        .insight-card {{
            background: var(--light);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }}

        .insight-card h3 {{
            color: var(--primary);
            margin-bottom: 10px;
        }}

        .cta-section {{
            background: linear-gradient(135deg, var(--primary), #4f46e5);
            color: white;
            padding: 40px;
            border-radius: 16px;
            text-align: center;
            margin-bottom: 30px;
        }}

        .cta-buttons {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }}

        .cta-button-external {{
            background: white;
            color: var(--primary);
            padding: 15px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 700;
            transition: all 0.3s ease;
        }}

        .cta-button-external:hover {{
            background: var(--light);
            transform: translateY(-2px);
        }}

        .footer {{
            background: var(--dark);
            color: white;
            padding: 30px;
            border-radius: 16px;
            text-align: center;
        }}

        .footer-content {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }}

        .footer-section h3 {{
            color: var(--secondary);
            margin-bottom: 10px;
        }}

        .footer-disclaimer {{
            border-top: 1px solid #555;
            padding-top: 20px;
            font-size: 12px;
            opacity: 0.8;
        }}

        @media (max-width: 768px) {{
            .systems-grid {{
                grid-template-columns: 1fr;
            }}

            .system-card.recommended {{
                transform: none;
            }}

            .payment-options {{
                grid-template-columns: 1fr;
            }}

            .insights-grid {{
                grid-template-columns: 1fr;
            }}

            .cta-buttons {{
                grid-template-columns: 1fr;
            }}
        }}
    </style>
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

        <!-- BANNER DE URGÊNCIA -->
        <div class="urgency-banner">
            ⚡ OPORTUNIDADE EXCLUSIVA: PAYBACK EXCEPCIONAL DE APENAS {melhor_sistema['payback_meses']:.1f} MESES! ⚡
        </div>

        <!-- SISTEMAS PROPOSTOS -->
        <div class="systems-grid">"""
        
        # Gerar cards dos sistemas
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
        
        # Continuar com o resto do HTML...
        html_template += f"""
        </div>

        <!-- TABELA COMPARATIVA -->
        <section class="comparison-table">
            <h3>📊 Comparação Detalhada dos Sistemas</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>Sistema</th>
                        <th>Potência</th>
                        <th>Priscado</th>
                        <th>PIX</th>
                        <th>12× S/Juros</th>
                        <th>18× Cartão</th>
                        <th>Geração/Mês</th>
                        <th>Payback</th>
                        <th>TIR</th>
                    </tr>
                </thead>
                <tbody>"""
        
        # Gerar linhas da tabela
        for i, sistema in enumerate(resultados[:5], 1):
            recomendado_row = "recommended-row" if sistema.get('recomendado', False) else ""
            sistema_nome = f"<strong>OPÇÃO {i} ⭐</strong><br>{sistema.get('titulo', f'Sistema {i}')}" if sistema.get('recomendado', False) else f"<strong>OPÇÃO {i}</strong><br>{sistema.get('titulo', f'Sistema {i}')}"
            
            html_template += f"""
                    <tr class="{recomendado_row}">
                        <td>{sistema_nome}</td>
                        <td>{sistema['pot_total']:.2f} kWp</td>
                        <td><span class="price-old">R$ {sistema['priscado']:,.2f}</span></td>
                        <td><strong>R$ {sistema['pix']:,.2f}</strong></td>
                        <td>R$ {sistema['parcela_12x']:,.2f}</td>
                        <td>R$ {sistema['parcela_18x']:,.2f}</td>
                        <td>{sistema['geracao_mensal']:.0f} kWh</td>
                        <td><strong>{sistema['payback_meses']:.1f} meses</strong></td>
                        <td>{sistema['tir_anual']:.1f}%</td>
                    </tr>"""
        
        # Finalizar HTML
        html_template += f"""
                </tbody>
            </table>
        </section>

        <!-- INSIGHTS ESTRATÉGICOS -->
        <section class="insights-section">
            <h3>Análise Estratégica</h3>
            <div class="insights-grid">
                <div class="insight-card">
                    <h3>💰 Melhor Investimento</h3>
                    <p><strong>{melhor_sistema.get('titulo', 'Sistema Recomendado')}</strong> oferece o melhor custo-benefício com payback de apenas <strong>{melhor_sistema['payback_meses']:.1f} meses</strong> e TIR de <strong>{melhor_sistema['tir_anual']:.1f}%</strong> ao ano.</p>
                </div>
                <div class="insight-card">
                    <h3>⚡ Economia Garantida</h3>
                    <p>Com o sistema recomendado, você economizará aproximadamente <strong>R$ {melhor_sistema['economia_mensal']:,.2f}/mês</strong> na conta de energia, totalizando <strong>R$ {melhor_sistema['economia_mensal'] * 12:,.2f}/ano</strong>.</p>
                </div>
                <div class="insight-card">
                    <h3>🌱 Sustentabilidade</h3>
                    <p>Em 25 anos, você evitará a emissão de <strong>168 toneladas de CO₂</strong>, contribuindo para um futuro mais sustentável.</p>
                </div>
                <div class="insight-card">
                    <h3>📈 Valorização do Imóvel</h3>
                    <p>Estudos indicam que imóveis com energia solar se valorizam em até <strong>8%</strong>, representando um ganho adicional de <strong>R$ 16.000,00</strong>.</p>
                </div>
            </div>
        </section>

        <!-- CALL TO ACTION -->
        <section class="cta-section">
            <h2>Próximos Passos</h2>
            <p>Transforme sua relação com a energia elétrica hoje mesmo!</p>
            <div class="cta-buttons">
                <a href="https://wa.me/5562991670536" class="cta-button-external">
                    <span>📱</span><br>
                    <strong>WhatsApp</strong><br>
                    Resposta imediata
                </a>
                <a href="tel:+5562991670536" class="cta-button-external">
                    <span>📞</span><br>
                    <strong>Ligar Agora</strong><br>
                    (62) 99167-0536
                </a>
                <a href="mailto:contato@piengsolucoes.com.br" class="cta-button-external">
                    <span>✉️</span><br>
                    <strong>E-mail</strong><br>
                    contato@piengsolucoes.com.br
                </a>
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
        """Gera proposta completa com todos os cálculos e formatação"""
        # Processar orçamentos
        resultados = self.processar_orcamentos(orcamentos, metodo_pdespesa)
        
        # Aplicar estratégias PNL
        resultados = self.aplicar_pnl_estrategias(resultados)
        
        # Gerar HTML
        html_proposta = self.gerar_html_proposta(cliente, resultados, metodo_pdespesa)
        
        return html_proposta

# Exemplo de uso
if __name__ == "__main__":
    sistema = SistemaPIENG()
    
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
    with open('proposta_variavel.html', 'w', encoding='utf-8') as f:
        f.write(proposta_variavel)
    
    print("✅ Proposta gerada com sucesso!")
    print("📁 Arquivo: proposta_variavel.html")
