// BANCO DE DADOS LOCAL
(function () {

    // Gerador de ID compatível com todos os navegadores (incluso file://)
    function gerarId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxx-xxxx-xxxx-xxxx'.replace(/x/g, function () {
            return (Math.random() * 16 | 0).toString(16);
        });
    }

    // Leitura segura do localStorage
    function lerStorage(key, fallback) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : fallback;
        } catch (e) {
            console.warn('Erro ao ler localStorage:', e);
            return fallback;
        }
    }

    // Escrita segura do localStorage
    function salvarStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn('Erro ao salvar no localStorage:', e);
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                showToast('Armazenamento cheio! Remova fotos antigas.');
            }
        }
    }

    let db = {
        obras: lerStorage('vynex_obras', []),
        responsaveis: lerStorage('vynex_resp', [])
    };

    const esc = s => String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));

    function salvar() {
        salvarStorage('vynex_obras', db.obras);
        salvarStorage('vynex_resp', db.responsaveis);
        renderAll();
    }

    // NAVEGAÇÃO
    let telaAtual = 'dashboard';

    function showScreen(screenId) {
        telaAtual = screenId;

        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById('screen-' + screenId);
        if (target) target.classList.add('active');

        const titles = {
            'dashboard': 'Painel de Controle',
            'obras': 'Obras',
            'responsaveis': 'Responsáveis'
        };
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.innerText = titles[screenId] || 'VyneX Control';

        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll(`[data-screen="${screenId}"]`).forEach(item => {
            item.classList.add('active');
        });

        fecharSidebar();
        renderAll();
    }

    // SIDEBAR MOBILE
    function abrirSidebar() {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebarOverlay').classList.add('show');
    }

    function fecharSidebar() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('show');
    }

    // MODAIS
    function openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
        if (id === 'modal-obra') renderCheckboxesResp();
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    function fecharTodosModais() {
        document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
        document.body.style.overflow = '';
    }

    // TOAST
    function showToast(msg) {
        const t = document.getElementById('toast');
        if (!t) return;
        t.innerText = msg;
        t.classList.add('show');
        clearTimeout(t._timeout);
        t._timeout = setTimeout(() => t.classList.remove('show'), 3000);
    }

    // CADASTRO DE RESPONSÁVEL
    const formResp = document.getElementById('form-resp');
    if (formResp) {
        formResp.addEventListener('submit', function (e) {
            e.preventDefault();
            const nome = document.getElementById('resp-nome').value.trim();
            const cargo = document.getElementById('resp-cargo').value;

            if (!nome) return;

            db.responsaveis.push({ id: gerarId(), nome, cargo });
            salvar();
            e.target.reset();
            showToast('Responsável cadastrado!');
        });
    }

    // CADASTRO DE OBRA
    const formObra = document.getElementById('form-obra');
    if (formObra) {
        formObra.addEventListener('submit', function (e) {
            e.preventDefault();
            const nome = document.getElementById('obra-nome').value.trim();
            const respIds = Array.from(
                document.querySelectorAll('#lista-resp-check input:checked')
            ).map(i => i.value);

            if (!nome || respIds.length === 0) {
                return showToast('Preencha nome e responsáveis');
            }

            const etapas = [
                { id: 1, nome: 'Fundação', foto: null },
                { id: 2, nome: 'Alvenaria', foto: null },
                { id: 3, nome: 'Elétrica', foto: null }
            ];

            db.obras.push({
                id: gerarId(),
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
    }

    // RENDERIZAÇÃO
    function renderAll() {
        const countObras = document.getElementById('count-obras');
        const countResp = document.getElementById('count-resp');
        if (countObras) countObras.innerText = db.obras.length;
        if (countResp) countResp.innerText = db.responsaveis.length;

        // Lista Responsáveis
        const listaResp = document.getElementById('lista-resp');
        if (listaResp) {
            if (db.responsaveis.length === 0) {
                listaResp.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">Nenhum responsável cadastrado.</p>';
            } else {
                listaResp.innerHTML = db.responsaveis.map(r => `
                    <div class="resp-card">
                        <div>
                            <strong>${esc(r.nome)}</strong>
                            <div class="resp-cargo">${esc(r.cargo)}</div>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Mapa rápido de responsáveis
        const mapaResp = new Map(db.responsaveis.map(r => [r.id, r.nome]));

        // Lista Obras
        const htmlObras = db.obras.map(o => {
            const respNomes = o.responsaveis
                .map(id => mapaResp.get(id) || 'Desconhecido')
                .join(', ');

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
                    <i class="fa-solid fa-users"></i> ${esc(respNomes)}
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

        const vazio = '<p style="color:var(--text-muted); text-align:center; padding:20px;">Nenhuma obra cadastrada ainda.</p>';
        const dash = document.getElementById('lista-obras-dash');
        const full = document.getElementById('lista-obras-full');
        if (dash) dash.innerHTML = htmlObras || vazio;
        if (full) full.innerHTML = htmlObras || vazio;
    }

    // VER DETALHES (CHECKLIST & FOTOS)
    function verDetalhes(id) {
        const obra = db.obras.find(o => o.id === id);
        if (!obra) return;

        const tituloEl = document.getElementById('detalhes-titulo');
        if (tituloEl) tituloEl.innerText = obra.nome;

        const container = document.getElementById('detalhes-conteudo');
        if (!container) return;

        const htmlEtapas = obra.etapas.map(etapa => {
            const imgTag = etapa.foto
                ? `<img src="${etapa.foto}" alt="Foto ${esc(etapa.nome)}">`
                : '<i class="fa-solid fa-camera"></i>';

            const mediaHtml = etapa.foto
                ? `<div class="stage-image">${imgTag}</div>`
                : `<div class="stage-placeholder">${imgTag}</div>`;

            return `
            <div class="stage-card">
                <div class="stage-header">${esc(etapa.nome)}</div>
                ${mediaHtml}
                <div class="stage-footer">
                    <span>${etapa.foto ? 'Concluído' : 'Pendente'}</span>
                    <label for="foto-${etapa.id}" class="btn-link">
                        <i class="fa-solid fa-upload"></i> Anexar Foto
                    </label>
                    <input type="file" id="foto-${etapa.id}" accept="image/*" capture="environment" style="display:none">
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

        // Liga eventos de upload
        container.querySelectorAll('input[type="file"]').forEach(input => {
            input.addEventListener('change', function () {
                const etapaId = Number(this.id.split('-')[1]);
                anexarFoto(obra.id, etapaId, this);
            });
        });
    }

    // COMPRIMIR IMAGEM
    function comprimirImagem(dataUrl) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const maxW = 800;
                const escala = Math.min(1, maxW / img.width);
                const canvas = document.createElement('canvas');
                canvas.width = img.width * escala;
                canvas.height = img.height * escala;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => resolve(dataUrl); // Se falhar compressão, usa original
            img.src = dataUrl;
        });
    }

    // ANEXAR FOTO
    function anexarFoto(obraId, etapaId, input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = async function (e) {
                const obra = db.obras.find(o => o.id === obraId);
                if (!obra) return;
                const etapa = obra.etapas.find(et => et.id === etapaId);
                if (!etapa) return;

                etapa.foto = await comprimirImagem(e.target.result);

                // Recalcular progresso
                const total = obra.etapas.length;
                const completas = obra.etapas.filter(et => et.foto).length;
                obra.progresso = Math.round((completas / total) * 100);

                salvar();
                verDetalhes(obraId);
                showToast('Foto anexada! Progresso atualizado.');
            };
            reader.onerror = () => showToast('Erro ao ler arquivo.');
            reader.readAsDataURL(input.files[0]);
        }
    }

    // GERAR CHECKBOXES NO MODAL DE OBRA
    function renderCheckboxesResp() {
        const container = document.getElementById('lista-resp-check');
        if (!container) return;

        if (db.responsaveis.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted); padding:10px;">Nenhum responsável cadastrado. Cadastre na aba "Responsáveis".</p>';
        } else {
            container.innerHTML = db.responsaveis.map(r => `
                <label class="custom-check">
                    <input type="checkbox" value="${r.id}"> ${esc(r.nome)} (${esc(r.cargo)})
                </label>
            `).join('');
        }
    }

    // EVENT LISTENER GLOBAL (delegação de eventos)
    document.body.addEventListener('click', function (e) {

        // Hamburger mobile
        if (e.target.closest('#hamburgerBtn')) {
            abrirSidebar();
            return;
        }

        // Overlay fecha sidebar
        if (e.target.closest('#sidebarOverlay')) {
            fecharSidebar();
            return;
        }

        // Navegação entre telas
        const tela = e.target.closest('[data-screen]');
        if (tela) {
            e.preventDefault();
            showScreen(tela.dataset.screen);
            return;
        }

        // Ações via data-action
        const alvo = e.target.closest('[data-action]');
        if (!alvo) return;

        const acao = alvo.dataset.action;

        if (acao === 'nova-obra') openModal('modal-obra');
        if (acao === 'fechar') closeModal(alvo.dataset.modal);
        if (acao === 'detalhes') verDetalhes(alvo.dataset.id);
    });

    // Fechar modal clicando fora dele
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    });

    // Tecla ESC fecha modais e sidebar
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            fecharTodosModais();
            fecharSidebar();
        }
    });

    // INICIAR
    renderAll();
})();