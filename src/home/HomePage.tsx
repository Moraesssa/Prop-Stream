import './HomePage.css';

const NAV_LINKS = [
  { label: 'Home', href: '#inicio' },
  { label: 'Features', href: '#recursos' },
  { label: 'Pricing', href: '#planos' },
  { label: 'Course Catalog', href: '#catalogo' },
];

const HERO_STATS = [
  { label: 'Alunos ativos', value: '12k+' },
  { label: 'Taxa de conclusão', value: '94%' },
  { label: 'Horas de conteúdo', value: '180h' },
];

const COURSE_CATEGORIES = [
  'Fundamentos',
  'Marketing & Leads',
  'Análise de Deals',
  'Financiamento',
  'Sistemas & Automação',
];

const CATALOG_COURSES = [
  {
    id: 'catalog-intro',
    title: 'Wholesaling 101',
    description:
      'Domine a base do wholesaling com frameworks replicáveis e checklists práticos.',
    level: 'Iniciante',
    duration: '8 módulos',
  },
  {
    id: 'catalog-leads',
    title: 'Máquina de Leads',
    description:
      'Crie campanhas multicanal, automatize follow-ups e multiplique suas oportunidades.',
    level: 'Intermediário',
    duration: '12 módulos',
  },
  {
    id: 'catalog-analysis',
    title: 'Deal Analysis Lab',
    description:
      'Aprenda a avaliar riscos, precificar contratos e negociar com margem segura.',
    level: 'Avançado',
    duration: '10 módulos',
  },
];

const FEATURED_COURSES = [
  {
    id: 'featured-finding-deals',
    title: 'Finding Motivated Sellers',
    summary: 'Treinamento intensivo focado em prospecção em mercados competitivos.',
    format: 'Sprint de 3 semanas',
    instructor: 'Marcus Reed',
    highlights: ['Playbooks de campanhas', 'Scripts prontos', 'Templates de CRM'],
  },
  {
    id: 'featured-analysis',
    title: 'Deal Analysis & BRRRR Strategy',
    summary: 'Aprenda a projetar fluxo de caixa, equity pós-reforma e ciclos de refinanciamento.',
    format: 'Bootcamp ao vivo',
    instructor: 'Fernanda Lopes',
    highlights: ['Planilhas dinâmicas', 'Casos reais', 'Suporte de mentoria'],
  },
  {
    id: 'featured-financing',
    title: 'Creative Financing Toolkit',
    summary: 'Domine seller financing, novações e estruturas híbridas para fechar mais contratos.',
    format: 'Programa on-demand',
    instructor: 'Rafael Martins',
    highlights: ['Modelos de contratos', 'Bancos de parceiros', 'Checklists jurídicos'],
  },
];

const LEARNING_PATH = [
  {
    id: 'path-foundations',
    title: 'Fundamentos de Wholesaling',
    description: 'Alinhe mentalidade, metas e métricas que importam no jogo de aquisições.',
  },
  {
    id: 'path-prospecting',
    title: 'Geração de Leads & Marketing',
    description: 'Construa funis previsíveis com campanhas omnichannel e nurturing contínuo.',
  },
  {
    id: 'path-analysis',
    title: 'Análise & Negociação',
    description: 'Faça underwriting completo, desenvolva ofertas irrecusáveis e gerencie objeções.',
  },
  {
    id: 'path-scale',
    title: 'Escala & Automação',
    description: 'Implemente sistemas operacionais, contrate o time certo e mantenha margem.',
  },
];

const INSTRUCTORS = [
  {
    id: 'instructor-marcus',
    name: 'Marcus Reed',
    role: 'Head de Aquisições na BlueDoor Capital',
    focus: 'Especialista em prospecção outbound e parcerias estratégicas.',
  },
  {
    id: 'instructor-fernanda',
    name: 'Fernanda Lopes',
    role: 'Analista-Chefe na Prop-Stream',
    focus: 'Lidera squads de underwriting e valuation de portfólios residenciais.',
  },
  {
    id: 'instructor-rafael',
    name: 'Rafael Martins',
    role: 'Consultor Jurídico & Estruturador Financeiro',
    focus: 'Referência em creative financing e conformidade regulatória.',
  },
];

const TESTIMONIALS = [
  {
    id: 'testimonial-john',
    name: 'John Batista',
    role: 'Founder, Skyline Investimentos',
    quote:
      'O playbook de captação e os templates de automação reduziram o ciclo de fechamento em 37%.',
  },
  {
    id: 'testimonial-isabela',
    name: 'Isabela Freitas',
    role: 'CEO, Vector Properties',
    quote:
      'As mentorias ao vivo transformaram nossa operação em um pipeline previsível e escalável.',
  },
];

function HeroVisualCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="home__hero-card">
      <span className="home__hero-card-label">{title}</span>
      <strong className="home__hero-card-value">{value}</strong>
      <p>{description}</p>
    </div>
  );
}

function CatalogCard({
  title,
  description,
  level,
  duration,
}: (typeof CATALOG_COURSES)[number]) {
  return (
    <article className="home__catalog-card">
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
      </header>
      <footer>
        <span>{level}</span>
        <span>{duration}</span>
      </footer>
    </article>
  );
}

function FeaturedCourseCard({
  title,
  summary,
  format,
  instructor,
  highlights,
}: (typeof FEATURED_COURSES)[number]) {
  return (
    <article className="home__featured-card">
      <header>
        <h3>{title}</h3>
        <p>{summary}</p>
      </header>
      <dl className="home__featured-meta">
        <div>
          <dt>Formato</dt>
          <dd>{format}</dd>
        </div>
        <div>
          <dt>Instrutor</dt>
          <dd>{instructor}</dd>
        </div>
      </dl>
      <ul className="home__featured-highlights">
        {highlights.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <button type="button">Ver detalhes</button>
    </article>
  );
}

function LearningPathStep({
  index,
  title,
  description,
}: (typeof LEARNING_PATH)[number] & { index: number }) {
  return (
    <li className="home__path-step">
      <span className="home__path-index">{index.toString().padStart(2, '0')}</span>
      <div>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
    </li>
  );
}

function InstructorCard({ name, role, focus }: (typeof INSTRUCTORS)[number]) {
  return (
    <article className="home__instructor-card">
      <div className="home__instructor-avatar" aria-hidden="true">
        {name
          .split(' ')
          .map((part) => part[0])
          .join('')}
      </div>
      <div>
        <h4>{name}</h4>
        <p className="home__instructor-role">{role}</p>
        <p>{focus}</p>
      </div>
    </article>
  );
}

function TestimonialCard({ quote, name, role }: (typeof TESTIMONIALS)[number]) {
  return (
    <figure className="home__testimonial">
      <blockquote>
        <p>“{quote}”</p>
      </blockquote>
      <figcaption>
        <strong>{name}</strong>
        <span>{role}</span>
      </figcaption>
    </figure>
  );
}

export default function HomePage() {
  return (
    <div className="home" id="inicio">
      <header className="home__hero">
        <div className="home__navbar">
          <div className="home__brand">
            <span className="home__brand-mark" aria-hidden="true">
              <span />
            </span>
            <div>
              <strong>Prop-Stream</strong>
              <span>University</span>
            </div>
          </div>
          <nav aria-label="Navegação principal" className="home__nav" id="recursos">
            <ul>
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="home__navbar-actions">
            <a href="#login" className="home__link-muted">
              Login
            </a>
            <button type="button" className="home__cta-primary">
              Get Started
            </button>
          </div>
        </div>

        <div className="home__hero-content">
          <div className="home__hero-copy">
            <span className="home__hero-eyebrow">Prop-Stream University</span>
            <h1>Master Real Estate Wholesaling</h1>
            <p>
              Destrave seu potencial com trilhas de aprendizado completas, simuladores de deals
              e mentorias com especialistas para acelerar resultados financeiros reais.
            </p>
            <div className="home__hero-actions">
              <button type="button" className="home__cta-primary">
                Explorar cursos
              </button>
              <button type="button" className="home__cta-secondary">
                Ver trilha completa
              </button>
            </div>
            <dl className="home__hero-stats">
              {HERO_STATS.map((stat) => (
                <div key={stat.label}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="home__hero-visual" aria-hidden="true">
            <HeroVisualCard
              title="Taxa média de fechamento"
              value="28%"
              description="+12 pts vs benchmark do mercado após 90 dias de programa."
            />
            <HeroVisualCard
              title="Pipeline ativo"
              value="36 deals"
              description="Dashboard integrado com indicadores de prioridade e ROI projetado."
            />
            <HeroVisualCard
              title="Score dos alunos"
              value="4.9/5"
              description="Experiência avaliada por mais de 2.400 investidores e operadores."
            />
          </div>
        </div>
      </header>

      <main className="home__content">
        <section className="home__section" id="catalogo">
          <header className="home__section-header">
            <div>
              <span className="home__section-eyebrow">Course Catalog</span>
              <h2>Trilhas construídas para dominar cada etapa do wholesaling</h2>
              <p>
                Combine teoria aplicável, estudos de caso e playbooks acionáveis para avançar do
                primeiro deal à escala com segurança.
              </p>
            </div>
            <div className="home__category-pills">
              {COURSE_CATEGORIES.map((category) => (
                <button key={category} type="button">
                  {category}
                </button>
              ))}
            </div>
          </header>
          <div className="home__catalog-grid">
            {CATALOG_COURSES.map((course) => (
              <CatalogCard key={course.id} {...course} />
            ))}
          </div>
        </section>

        <section className="home__section home__section--muted" id="destaques">
          <header className="home__section-header">
            <div>
              <span className="home__section-eyebrow">Featured Courses</span>
              <h2>Programas intensivos com impacto comprovado</h2>
              <p>
                Planos de estudo guiados, acompanhamento por mentores e frameworks aplicáveis no dia a dia.
              </p>
            </div>
            <a href="#todos-os-cursos" className="home__link-muted">
              Ver todos os cursos
            </a>
          </header>
          <div className="home__featured-grid">
            {FEATURED_COURSES.map((course) => (
              <FeaturedCourseCard key={course.id} {...course} />
            ))}
          </div>
        </section>

        <div className="home__split">
          <section className="home__section" id="trilha">
            <header className="home__section-header">
              <div>
                <span className="home__section-eyebrow">Learning Path</span>
                <h2>Uma jornada estruturada para sair da teoria e fechar deals reais</h2>
                <p>
                  Cada etapa libera checklists, simuladores e sessões com especialistas para acelerar sua execução.
                </p>
              </div>
            </header>
            <ol className="home__path-list">
              {LEARNING_PATH.map((step, index) => (
                <LearningPathStep key={step.id} index={index + 1} {...step} />
              ))}
            </ol>
          </section>

          <section className="home__section home__section--compact" id="mentores">
            <header className="home__section-header">
              <div>
                <span className="home__section-eyebrow">Instructor Profiles</span>
                <h2>Mentores que operam no campo de batalha imobiliário</h2>
                <p>
                  Aprenda com executivos, analistas e consultores que lideram operações multimilionárias todos os dias.
                </p>
              </div>
            </header>
            <div className="home__instructor-grid">
              {INSTRUCTORS.map((instructor) => (
                <InstructorCard key={instructor.id} {...instructor} />
              ))}
            </div>
          </section>
        </div>

        <section className="home__section home__section--muted" id="planos">
          <header className="home__section-header">
            <div>
              <span className="home__section-eyebrow">Testimonials</span>
              <h2>Resultados que ecoam nos principais mercados</h2>
              <p>
                Times que aplicaram a metodologia Prop-Stream University expandiram operações e aumentaram margens em tempo recorde.
              </p>
            </div>
          </header>
          <div className="home__testimonial-grid">
            {TESTIMONIALS.map((testimonial) => (
              <TestimonialCard key={testimonial.id} {...testimonial} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
