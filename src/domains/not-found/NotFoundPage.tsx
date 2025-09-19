import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-heading">
      <h2 id="not-found-heading">Conteúdo não encontrado</h2>
      <p>Revisamos nossas rotas, mas não encontramos o recurso solicitado.</p>
      <Link to="/">Voltar para o cockpit</Link>
    </section>
  );
}
