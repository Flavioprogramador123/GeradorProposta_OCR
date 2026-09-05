import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

/** Hub V3 removido — funções redistribuídas no /admin e no fluxo de orçamento. */
export default function AdminV3HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  return (
    <>
      <Head>
        <title>Redirecionando… — PIENG</title>
      </Head>
      <div className="admin-shell flex items-center justify-center">
        <p className="text-slate-300 text-sm">Redirecionando para o Admin…</p>
      </div>
    </>
  );
}
