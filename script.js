// BANCO DE DADOS LOCAL
(function (){
    let db = {
    obras: JSON.parse(localStorage.getItem('vynex_obras')) || [],
    responsaveis: JSON.parse(localStorage.getItem('vynex_resp')) || []};

    const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function salvar() {
    localStorage.setItem('vynex_obras', JSON.stringify(db.obras));
    localStorage.setItem('vynex_resp', JSON.stringify(db.responsaveis));
    renderAll();
}

// NAVEGAÇÃO
function showScreen(screenId) {
    // Esconde todas as telas
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + screenId).classList.add('active');
    
    // Atualiza títulos
    const titles = { 'dashboard': 'Painel de Controle', 'obras': 'Obras', 'responsaveis': 'Responsáveis' };
    document.getElementById('page-title').innerText = titles[screenId] || 'VyneX Control';

    // Atualiza classes ativas na Sidebar e Bottom Nav
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    

    // Encontra o item clicado (seveve pelo onclick no HTML)
    document.querySelectorAll(`[data-screen="${screenId}"]`).forEach(item => item.classList.add('active'));
    renderAll();
}

// MODAIS
function openModal(id) {
    document.getElementById(id).classList.add('show');
    if(id === 'modal-obra') renderCheckboxesResp();
}
function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

// TOAST
function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// CADASTRO DE RESPONSÁVEL
document.getElementById('form-resp').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('resp-nome').value;
    const cargo = document.getElementById('resp-cargo').value;
    
    if(!nome) return;
    
    db.responsaveis.push({ id: crypto.randomUUID(), nome, cargo });
    salvar();
    e.target.reset();
    showToast('Responsável cadastrado!');
});

// CADASTRO DE OBRA
document.getElementById('form-obra').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('obra-nome').value;
    const respIds = Array.from(document.querySelectorAll('#lista-resp-check input:checked')).map(i => i.value);
    
    if(!nome || respIds.length === 0) return showToast('Preencha nome e responsáveis');
    
    const etapas = [
        { id: 1, nome: 'Fundação', foto: null },
        { id: 2, nome: 'Alvenaria', foto: null },
        { id: 3, nome: 'Elétrica', foto: null }
    ];

    db.obras.push({
        id: crypto.randomUUID(),
        nome,
        responsaveis: respIds,
        etapas,
        progresso: 0
    });
    salvar();
    e.target.reset();
    closeModal('modal-obra');
    showToast('Obra criada com sucesso!');
});

// RENDERIZAÇÃO
function renderAll() {
    // Stats
    document.getElementById('count-obras').innerText = db.obras.length;
    document.getElementById('count-resp').innerText = db.responsaveis.length;

    // Lista Responsaveis
    const listaResp = document.getElementById('lista-resp');
    listaResp.innerHTML = db.responsaveis.map(r => `
        <div class ="resp-card">
            <div>
                <strong>${esc(r.nome)}</strong>
                <div class="resp-cargo">${esc(r.cargo)}</div>
            </div>
        </div>
    `).join('');

    // Lista Obras (Dash e Full)
    const htmlObras = db.obras.map(o => {
        // Cria um Mapa rápido: ID -> Nome
        const mapaResp = new Map(db.responsaveis.map(r => [r.id, r.nome]));
        
        // Pega os nomes direto do Mapa
        const respNomes = o.responsaveis.map(id => mapaResp.get(id) || 'Desconhecido').join(', ');

        return `
        <div class="project-card">
            <div class="project-header">
                <div class="project-title">
                    <h4>${esc(o.nome)}</h4>
                    <span class="tag">Em Andamento</span>
                </div>
                <button class="btn-primary" data-action="detalhes" data-id="${o.id}">
                    <i class="fa-solid fa-eye"></i> Ver Detalhes
                </button>
            </div>
            <div style="font-size:0.9rem; color:var(--text-muted);">
                <i class="fa-solid fa-users"></i> ${respNomes}
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${o.progresso}%"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted);">
                <span>Progresso</span>
                <strong style="color:var(--primary)">${o.progresso}%</strong>
            </div>
        </div>`;
    }).join('');

    const telaAtiva = document.querySelector('.screen.active')?.id;
    const vazio = '<p style="color:var(--text-muted); text-align:center; padding:20px;" >Nenhuma obra cadastrada ainda. </p>';
    if (telaAtiva !== 'screen-obras')
        document.getElementById('lista-obras-dash').innerHTML = htmlObras || vazio;
    if (telaAtiva !== 'screen-dashboard')
        document.getElementById('lista-obras-full').innerHTML = htmlObras || vazio;
}

// VER DETALHES (CHECKLIST & FOTOS)
function verDetalhes(id) {
    const obra = db.obras.find(o => o.id === id);
    if(!obra) return;

    document.getElementById('detalhes-titulo').innerText = obra.nome;
    const container = document.getElementById('detalhes-conteudo');
    
    const htmlEtapas = obra.etapas.map(etapa => {
        const temFoto = etapa.foto ? 'img' : 'div';
        const imgTag = etapa.foto ? `<img src="${etapa.foto}">` : '<i class="fa-solid fa-camera"></i>';
        
        return `
        <div class="stage-card">
            <div class="stage-header">${etapa.nome}</div>
            ${temFoto === 'img' 
                ? `<div class="stage-image">${imgTag}</div>` 
                : `<div class="stage-placeholder">${imgTag}</div>`}
            <div class="stage-footer">
                <span>${etapa.foto ? 'Concluído' : 'Pendente'}</span>
                <label for="foto-${etapa.id}" class="btn-link">
                    <i class="fa-solid fa-upload"></i> Anexar Foto
                </label>
                <input type="file" id="foto-${etapa.id}" accept="image/*" style="display:none">
            </div>
        </div>`;
    }).join('');

    container.innerHTML = `
        <h4>Checklist de Fotos por Etapa</h4>
        <p style="color:var(--text-muted); margin-bottom:15px; font-size:0.9rem;">Anexe fotos para comprovar o andamento.</p>
        <div class="stages-grid">
            ${htmlEtapas}
        </div>
    `;

    openModal('modal-detalhes');
    
    // Liga o evento de upload nos inputs de foto
    container.querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener('change', function(){
            const etapaId = Number(this.id.split('-')[1]);
            anexarFoto(obra.id, etapaId, this);
        });
    });
}

// ANEXAR FOTO
function comprimirImagem(dataUrl){
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const maxW = 800;
            const escala = Math.min(1, maxW / img.width);
            const canvas = document.createElement('canvas');
            canvas.width = img.width * escala;
            canvas.height = img.height * escala;
            canvas.getContext('2d').drawImage(img, 0, 0,canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = dataUrl;
    });
}
function anexarFoto(obraId, etapaId, input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const obra = db.obras.find(o => o.id === obraId);
            const etapa = obra.etapas.find(e => e.id === etapaId);
            etapa.foto = await comprimirImagem(e.target.result);
            
            // Recalcular progresso
            const total = obra.etapas.length;
            const completas = obra.etapas.filter(e => e.foto).length;
            obra.progresso = Math.round((completas / total) * 100);
            
            try {
                salvar();
            } catch (erro) {
                showToast('Armazenamento Cheio! Remova fotos antigas');
            }
            
           
            verDetalhes(obraId); // Atualiza o modal
            showToast('Foto anexada! Progresso atualizado.');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// GERAR CHECKBOXES NO MODAL DE OBRA
function renderCheckboxesResp() {
    const container = document.getElementById('lista-resp-check');
    if(db.responsaveis.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); padding:10px;">Nenhum responsável cadastrado. Cadastre na aba "Responsáveis".</p>';
    } else {
        container.innerHTML = db.responsaveis.map(r => `
            <label class="custom-check">
                <input type="checkbox" value="${r.id}"> ${esc(r.nome)} (${esc(r.cargo)})
            </label>
        `).join('');
    }
}
    document.body.addEventListener('click', function(e){
        const tela = e.target.closest('[data-screen]');
        if (tela){
            e.preventDefault();
            showScreen(tela.dataset.screen);
            return;
        }

        const alvo = e.target.closest('[data-action]');
        if (!alvo) return;

        if (alvo.dataset.action === 'nova-obra') openModal('modal-obra');
        if (alvo.dataset.action === 'fechar') closeModal(alvo.dataset.modal);
       if (alvo.dataset.action === 'detalhes') verDetalhes(alvo.dataset.id);
    });
// INICIAR
renderAll();
})();