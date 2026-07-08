/**
 * Impressao de documento em varias paginas.
 *
 * Em vez de imprimir o overlay (que fica em position:fixed com rolagem e por
 * isso o navegador corta em uma pagina), clonamos a folha .doc-sheet para um
 * container no nivel do body, sem ancestrais com overflow/altura fixa. Assim o
 * conteudo flui naturalmente por quantas paginas forem necessarias.
 */
export function imprimirDocumento(alvo?: Element | null) {
  const folha =
    alvo || document.querySelector('.doc-overlay .doc-sheet');
  if (!folha) {
    window.print();
    return;
  }

  let area = document.getElementById('area-impressao');
  if (!area) {
    area = document.createElement('div');
    area.id = 'area-impressao';
    document.body.appendChild(area);
  }
  area.innerHTML = '';
  area.appendChild(folha.cloneNode(true));
  document.body.classList.add('modo-impressao');

  const limpar = () => {
    document.body.classList.remove('modo-impressao');
    const a = document.getElementById('area-impressao');
    if (a) a.innerHTML = '';
    window.removeEventListener('afterprint', limpar);
  };

  window.addEventListener('afterprint', limpar);
  window.print();
}
