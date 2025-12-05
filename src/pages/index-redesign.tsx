import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Sun, 
  Zap, 
  BarChart3, 
  Users, 
  Image as ImageIcon,
  ArrowRight,
  CheckCircle,
  Star,
  Phone,
  Mail,
  MapPin,
  Menu,
  X
} from 'lucide-react';

const IndexRedesign = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const services = [
    {
      icon: Sun,
      title: 'Propostas Solares',
      description: 'Geração automática de propostas técnicas e comerciais',
      link: '/propostas',
      color: 'yellow'
    },
    {
      icon: BarChart3,
      title: 'Análise Solar',
      description: 'Análise de potencial solar com dados INMET',
      link: '/solar',
      color: 'orange'
    },
    {
      icon: ImageIcon,
      title: 'Image Studio',
      description: 'Geração de imagens com IA para projetos',
      link: '/studio',
      color: 'purple'
    },
    {
      icon: Users,
      title: 'Gestão de Clientes',
      description: 'CRM completo para energia solar',
      link: '/gestao',
      color: 'green'
    },
    {
      icon: Zap,
      title: 'Automação',
      description: 'Automação de processos industriais',
      link: '/automacao',
      color: 'red'
    }
  ];

  const features = [
    'Geração automática de propostas',
    'Análise de potencial solar',
    'Integração com dados INMET',
    'CRM completo',
    'Automação de processos',
    'Relatórios detalhados'
  ];

  const testimonials = [
    {
      name: 'João Silva',
      company: 'SolarTech Ltda',
      text: 'O sistema PIENG revolucionou nossa operação. Economizamos 80% do tempo na geração de propostas.',
      rating: 5
    },
    {
      name: 'Maria Santos',
      company: 'Energia Verde',
      text: 'A análise solar automatizada nos deu uma vantagem competitiva incrível no mercado.',
      rating: 5
    },
    {
      name: 'Carlos Oliveira',
      company: 'SolarMax',
      text: 'Interface intuitiva e resultados profissionais. Recomendo para qualquer empresa do setor.',
      rating: 5
    }
  ];

  return (
    <>
      <Head>
        <title>PIENG Soluções Energéticas - Sistema Completo de Energia Solar</title>
        <meta name="description" content="Sistema completo para geração de propostas solares, análise de potencial, gestão de clientes e automação industrial. Economize tempo e aumente vendas." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative w-12 h-12">
                <Image
                  src="/assets/logos/logo-pieng-principal.jpg"
                  alt="PIENG Soluções Energéticas"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PIENG</h1>
                <p className="text-sm text-gray-600">Soluções Energéticas</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#servicos" className="text-gray-700 hover:text-yellow-600 transition-colors">Serviços</a>
              <a href="#sobre" className="text-gray-700 hover:text-yellow-600 transition-colors">Sobre</a>
              <a href="#depoimentos" className="text-gray-700 hover:text-yellow-600 transition-colors">Depoimentos</a>
              <a href="#contato" className="text-gray-700 hover:text-yellow-600 transition-colors">Contato</a>
            </nav>

            {/* CTA Button */}
            <div className="hidden md:block">
              <Link href="/propostas">
                <button className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center space-x-2">
                  <span>Começar Agora</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <nav className="flex flex-col space-y-4">
                <a href="#servicos" className="text-gray-700 hover:text-yellow-600 transition-colors">Serviços</a>
                <a href="#sobre" className="text-gray-700 hover:text-yellow-600 transition-colors">Sobre</a>
                <a href="#depoimentos" className="text-gray-700 hover:text-yellow-600 transition-colors">Depoimentos</a>
                <a href="#contato" className="text-gray-700 hover:text-yellow-600 transition-colors">Contato</a>
                <Link href="/propostas">
                  <button className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition-colors w-full">
                    Começar Agora
                  </button>
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 bg-gradient-to-br from-yellow-50 to-orange-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Sistema Completo de
                <span className="text-yellow-600"> Energia Solar</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Gere propostas profissionais, analise potencial solar e gerencie clientes 
                com nossa plataforma integrada. Economize tempo e aumente suas vendas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/propostas">
                  <button className="bg-yellow-500 text-white px-8 py-4 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center space-x-2 text-lg font-semibold">
                    <Sun className="w-6 h-6" />
                    <span>Gerar Proposta</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <button className="border-2 border-yellow-500 text-yellow-600 px-8 py-4 rounded-lg hover:bg-yellow-50 transition-colors text-lg font-semibold">
                  Ver Demonstração
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <div className="text-center">
                  <Sun className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Sistema PIENG</h3>
                  <div className="space-y-3">
                    {features.slice(0, 4).map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Nossos Serviços
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Uma plataforma completa para todas as suas necessidades em energia solar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <Link key={index} href={service.link}>
                  <div className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-100 hover:border-yellow-200 cursor-pointer">
                    <div className={`w-16 h-16 bg-${service.color}-100 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-8 h-8 text-${service.color}-600`} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-yellow-600 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {service.description}
                    </p>
                    <div className="flex items-center text-yellow-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                      <span>Acessar</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Por que escolher o PIENG?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Desenvolvido por engenheiros especialistas em energia solar, 
                o sistema PIENG oferece todas as ferramentas necessárias para 
                otimizar seu negócio e aumentar suas vendas.
              </p>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="text-gray-700 text-lg">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center">
                  <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Sun className="w-10 h-10 text-yellow-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Economia Garantida</h3>
                  <div className="text-4xl font-bold text-yellow-600 mb-2">88%</div>
                  <p className="text-gray-600">Redução de custos operacionais</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="depoimentos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              O que nossos clientes dizem
            </h2>
            <p className="text-xl text-gray-600">
              Mais de 100 empresas já confiam no PIENG
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-8">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">
                  "{testimonial.text}"
                </p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-gray-600">{testimonial.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-yellow-500 to-orange-500">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Pronto para revolucionar seu negócio?
          </h2>
          <p className="text-xl text-yellow-100 mb-8">
            Comece hoje mesmo e veja a diferença que o PIENG pode fazer
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/propostas">
              <button className="bg-white text-yellow-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2 text-lg font-semibold">
                <Sun className="w-6 h-6" />
                <span>Começar Grátis</span>
              </button>
            </Link>
            <button className="border-2 border-white text-white px-8 py-4 rounded-lg hover:bg-white hover:text-yellow-600 transition-colors text-lg font-semibold">
              Falar com Especialista
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="relative w-12 h-12">
                  <Image
                    src="/assets/logos/logo-pieng-principal.jpg"
                    alt="PIENG Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">PIENG</h3>
                  <p className="text-gray-400">Soluções Energéticas</p>
                </div>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                Sistema completo para geração de propostas solares, análise de potencial 
                e gestão de clientes. Economize tempo e aumente suas vendas.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Serviços</h4>
              <ul className="space-y-2">
                <li><a href="/propostas" className="text-gray-400 hover:text-white transition-colors">Propostas Solares</a></li>
                <li><a href="/solar" className="text-gray-400 hover:text-white transition-colors">Análise Solar</a></li>
                <li><a href="/studio" className="text-gray-400 hover:text-white transition-colors">Image Studio</a></li>
                <li><a href="/gestao" className="text-gray-400 hover:text-white transition-colors">Gestão</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Contato</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-400">(62) 99999-9999</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-400">contato@piengsolucoes.com.br</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-400">Goiânia, GO</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 PIENG Soluções Energéticas. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default IndexRedesign;
