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

    // ===== CHECKLIST PADRÃO PARA TODAS AS OBRAS =====
    const checklistPadrao = [
        { id: 1,  nome: 'Limpeza e Preparação do Terreno' },
        { id: 2,  nome: 'Marcação e Abertura de Valas' },
        { id: 3,  nome: 'Fundação e Isolamento' },
        { id: 4,  nome: 'Levantamento da Alvenaria' },
        { id: 5,  nome: 'Chapisco e Reboco' },
        { id: 6,  nome: 'Instalação Elétrica (Cabeamento)' },
        { id: 7,  nome: 'Instalação Hidrossanitária' },
        { id: 8,  nome: 'Piso e Revestimento' },
        { id: 9,  nome: 'Esquadrias (Portas e Janelas)' },
        { id: 10, nome: 'Pintura e Acabamento' },
        { id: 11, nome: 'Instalação de Louças e Metais' },
        { id: 12, nome: 'Limpeza Final e Entrega' }
    ];

    // CADASTRO DE OBRA (Checklist padrão automático)
    const formObra = document.getElementById('form-obra');
    if (formObra) {
        formObra.addEventListener('submit', function (e) {
            e.preventDefault();

            const nome = document.getElementById('obra-nome').value.trim();
            const respIds = Array.from(
                document.querySelectorAll('#lista-resp-check input:checked')
            ).map(i => i.value);

            if (!nome || respIds.length === 0) {
                return showToast('Preencha o nome e os responsáveis!');
            }

            // Gera as etapas a partir do checklist padrão
            const etapas = checklistPadrao.map(etapa => ({
                id: etapa.id,
                nome: etapa.nome,
                foto: null,
                pulada: false   // marca se a etapa foi "pular/não se aplica"
            }));

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
            showToast('Obra criada com checklist padrão!');
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
                <div class="project-actions">
                    <button class="btn-primary btn-sm" data-action="detalhes" data-id="${o.id}">
                        <i class="fa-solid fa-eye"></i> Ver
                    </button>
                    <button class="btn-edit" data-action="editar" data-id="${o.id}" aria-label="Editar obra">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-delete" data-action="excluir" data-id="${o.id}" aria-label="Excluir obra">
                        <i class="fa-solid fa-trash"></i>
                    </button>
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

            // Etapa marcada como "não se aplica"
            if (etapa.pulada) {
                return `
                <div class="stage-card stage-pulada">
                    <div class="stage-header">${esc(etapa.nome)}</div>
                    <div class="stage-placeholder">
                        <i class="fa-solid fa-ban"></i>
                    </div>
                    <div class="stage-footer">
                        <span>Não se aplica</span>
                        <button class="btn-link" data-action="restaurar-etapa"
                            data-obra="${obra.id}" data-etapa="${etapa.id}">
                            <i class="fa-solid fa-rotate-left"></i> Restaurar
                        </button>
                    </div>
                </div>`;
            }

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
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <label for="foto-${etapa.id}" class="btn-link">
                            <i class="fa-solid fa-upload"></i> Foto
                        </label>
                        <button class="btn-link btn-skip" data-action="pular-etapa"
                            data-obra="${obra.id}" data-etapa="${etapa.id}">
                            <i class="fa-solid fa-ban"></i> Pular
                        </button>
                    </div>
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
               // Etapas que realmente valem para essa obra (ignora as puladas)
                const validas = obra.etapas.filter(et => !et.pulada);
                const total = validas.length;
                const completas = validas.filter(et => et.foto).length;
                obra.progresso = total === 0 ? 100 : Math.round((completas / total) * 100);

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

        // EDITAR OBRA
    let obraEditandoId = null;

    function abrirModalEditar(obraId) {
        const obra = db.obras.find(o => o.id === obraId);
        if (!obra) return;

        const inputNome = document.getElementById('obra-nome-edit');
        if (inputNome) inputNome.value = obra.nome;

        const containerCheck = document.getElementById('lista-resp-check-edit');
        if (containerCheck) {
            if (db.responsaveis.length === 0) {
                containerCheck.innerHTML = '<p style="color:var(--text-muted); padding:10px;">Nenhum responsável cadastrado.</p>';
            } else {
                containerCheck.innerHTML = db.responsaveis.map(r => `
                    <label class="custom-check">
                        <input type="checkbox" value="${r.id}" ${obra.responsaveis.includes(r.id) ? 'checked' : ''}>
                        ${esc(r.nome)} (${esc(r.cargo)})
                    </label>
                `).join('');
            }
        }

        obraEditandoId = obraId;
        openModal('modal-editar');
    }

    const formEditar = document.getElementById('form-editar-obra');
    if (formEditar) {
        formEditar.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!obraEditandoId) return;

            const obra = db.obras.find(o => o.id === obraEditandoId);
            if (!obra) return;

            const novoNome = document.getElementById('obra-nome-edit').value.trim();
            if (!novoNome) return showToast('Informe o nome da obra!');

            const novosResp = Array.from(
                document.querySelectorAll('#lista-resp-check-edit input:checked')
            ).map(i => i.value);

            if (novosResp.length === 0) return showToast('Selecione pelo menos um responsável!');

            obra.nome = novoNome;
            obra.responsaveis = novosResp;

            salvar();
            closeModal('modal-editar');
            obraEditandoId = null;
            showToast('Obra atualizada com sucesso!');
        });
    }

    // EXCLUIR OBRA (com modal de confirmação)
    let obraExcluindoId = null;

    function pedirExclusao(obraId) {
        const obra = db.obras.find(o => o.id === obraId);
        if (!obra) return;

        obraExcluindoId = obra.id;
        const txt = document.getElementById('confirmar-texto');
        if (txt) txt.innerText = `Tem certeza que deseja excluir "${obra.nome}"? Essa ação não pode ser desfeita.`;
        openModal('modal-confirmar');
    }

    function confirmarExclusao() {
        if (!obraExcluindoId) return;
        db.obras = db.obras.filter(o => o.id !== obraExcluindoId);
        obraExcluindoId = null;
        closeModal('modal-confirmar');
        salvar();
        showToast('Obra excluída!');
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

        if (acao === 'editar') abrirModalEditar(alvo.dataset.id);
        if (acao === 'excluir') pedirExclusao(alvo.dataset.id);
        if (acao === 'confirmar-exclusao') confirmarExclusao();
        if (acao === 'nova-obra') openModal('modal-obra');
        if (acao === 'fechar') closeModal(alvo.dataset.modal);
        if (acao === 'detalhes') verDetalhes(alvo.dataset.id);
                if (acao === 'pular-etapa') {
            const obra = db.obras.find(o => o.id === alvo.dataset.obra);
            const etapa = obra?.etapas.find(e => e.id === Number(alvo.dataset.etapa));
            if (etapa) {
                etapa.pulada = true;
                etapa.foto = null;          // limpa a foto, pois a etapa saiu do cálculo
                salvar();
                verDetalhes(obra.id);
                showToast('Etapa marcada como não aplicada.');
            }
        }

        if (acao === 'restaurar-etapa') {
            const obra = db.obras.find(o => o.id === alvo.dataset.obra);
            const etapa = obra?.etapas.find(e => e.id === Number(alvo.dataset.etapa));
            if (etapa) {
                etapa.pulada = false;
                salvar();
                verDetalhes(obra.id);
                showToast('Etapa restaurada.');
            }
        }
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