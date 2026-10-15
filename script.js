// BANCO DE DADOS LOCAL
let db = {
    obras: JSON.parse(localStorage.getItem('vynex_obras')) || [],
    responsaveis: JSON.parse(localStorage.getItem('vynex_resp')) || []
};

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
    const clickedItem = document.querySelector(`[onclick="showScreen('${screenId}')"]`);
    if(clickedItem) clickedItem.classList.add('active');
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
    
    db.responsaveis.push({ id: Date.now(), nome, cargo });
    salvar();
    e.target.reset();
    showToast('Responsável cadastrado!');
});

// CADASTRO DE OBRA
document.getElementById('form-obra').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('obra-nome').value;
    const respIds = Array.from(document.querySelectorAll('#lista-resp-check input:checked')).map(i => parseInt(i.value));
    
    if(!nome || respIds.length === 0) return showToast('Preencha nome e responsáveis');
    
    const etapas = [
        { id: 1, nome: 'Fundação', foto: null },
        { id: 2, nome: 'Alvenaria', foto: null },
        { id: 3, nome: 'Elétrica', foto: null }
    ];

    db.obras.push({
        id: Date.now(),
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
        <div style="background:var(--bg-card); padding:12px; margin-bottom:8px; border-radius:8px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong>${r.nome}</strong>
                <div style="font-size:0.85rem; color:var(--text-muted);">${r.cargo}</div>
            </div>
        </div>
    `).join('');

    // Lista Obras (Dash e Full)
    const htmlObras = db.obras.map(o => {
        const respNomes = o.responsaveis.map(id => {
            const r = db.responsaveis.find(x => x.id === id);
            return r ? r.nome : 'Desconhecido';
        }).join(', ');

        return `
        <div class="project-card">
            <div class="project-header">
                <div class="project-title">
                    <h4>${o.nome}</h4>
                    <span class="tag">Em Andamento</span>
                </div>
                <button class="btn-primary" onclick="verDetalhes(${o.id})">
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

    document.getElementById('lista-obras-dash').innerHTML = htmlObras || '<p style="color:var(--text-muted); text-align:center; padding:20px;">Nenhuma obra cadastrada ainda.</p>';
    document.getElementById('lista-obras-full').innerHTML = htmlObras || '<p style="color:var(--text-muted); text-align:center; padding:20px;">Nenhuma obra cadastrada ainda.</p>';
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
                <input type="file" id="foto-${etapa.id}" accept="image/*" style="display:none" onchange="anexarFoto(${obra.id}, ${etapa.id}, this)">
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
}

// ANEXAR FOTO
function anexarFoto(obraId, etapaId, input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const obra = db.obras.find(o => o.id === obraId);
            const etapa = obra.etapas.find(e => e.id === etapaId);
            etapa.foto = e.target.result;
            
            // Recalcular progresso
            const total = obra.etapas.length;
            const completas = obra.etapas.filter(e => e.foto).length;
            obra.progresso = Math.round((completas / total) * 100);
            
            salvar();
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
                <input type="checkbox" value="${r.id}"> ${r.nome} (${r.cargo})
            </label>
        `).join('');
    }
}

// INICIAR
renderAll();