// ================================================================
// 1. CONFIGURAÇÕES E INICIALIZAÇÃO
// ================================================================

window.onload = () => { 
    // Carrega a aba inicial (Geralmente Produtos)
    carregarProdutos(); 
    carregarAgenda(); 
};

// ================================================================
// 2. CONTROLE DE INTERFACE (ABAS E MODAL)
// ================================================================

function abrirAba(evt, nomeAba) {
    const conteudos = document.getElementsByClassName("tab-content");
    for (let i = 0; i < conteudos.length; i++) {
        conteudos[i].style.display = "none";
        conteudos[i].classList.remove("active");
    }

    const botoes = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < botoes.length; i++) {
        botoes[i].classList.remove("active");
    }

    const abaAtual = document.getElementById(nomeAba);
    abaAtual.style.display = "block";
    abaAtual.classList.add("active");
    evt.currentTarget.classList.add("active");

    // Gatilhos de carregamento ao abrir a aba específica
    if(nomeAba === 'aba-produtos') carregarProdutos();
    if(nomeAba === 'aba-solicitacoes') carregarSolicitacoes();
    if(nomeAba === 'aba-agendamentos') carregarAgenda();
    if(nomeAba === 'aba-historico') carregarHistorico();
    if(nomeAba === 'aba-financeiro') carregarRelatorioFinanceiro();
}

function abrirModal() {
    document.getElementById('modal-cadastro').style.display = "block";
}

function fecharModal() {
    document.getElementById('modal-cadastro').style.display = "none";
}

// ================================================================
// 3. GESTÃO DE PRODUTOS (CATÁLOGO DO DONO)
// ================================================================

// Carrega os itens que o fornecedor possui
function carregarProdutos() {
    const grid = document.getElementById('grid-produtos');
    if (!grid) return;

    database.ref('produtos').on('value', (snapshot) => {
        grid.innerHTML = "";
        const dados = snapshot.val();        

        if (!dados) {
            grid.innerHTML = "<p class='aviso'>Nenhum produto cadastrado.</p>";
            return;
        }

        Object.keys(dados).forEach(id => {
            const p = dados[id];
            const imgExibicao = p.imagem ? p.imagem.split(',')[0] : 'https://via.placeholder.com/300x200';            

            grid.innerHTML += `
                <div class="card-padrao">
                    <img src="${imgExibicao}" class="img-card">
                    <div class="conteudo-card">
                        <span class="tag-categoria">${p.categoria || 'Geral'}</span>
                        
                        <div style="display:flex; justify-content:space-between; align-items: center;">
                            <h3>${p.nome}</h3> 
                            <button class="btn-lixo" onclick="excluirItem('produtos/${id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>

                        <p>Status: <strong>${p.status || 'ativo'}</strong></p>
                        <p>Estoque Total: <strong>${p.estoque_total || 0}</strong></p>
                        <div class="valor-tag">R$ ${p.valor || '0,00'}</div>

                        <button onclick="alternarStatusProduto('${id}', '${p.status}')" class="btn-secundario" style="width:100%; margin-top:10px;">
                            <i class="fas ${p.status === 'bloqueado' ? 'fa-eye' : 'fa-eye-slash'}"></i> 
                            ${p.status === 'bloqueado' ? ' Ativar no Catálogo' : ' Bloquear Item'}
                        </button>
                    </div>
                </div>`;
        });
    });
}

// Certifique-se de que a função de alternar status tenha o mesmo nome chamado no botão
function alternarStatusProduto(id, statusAtual) {
    const novoStatus = statusAtual === 'bloqueado' ? 'ativo' : 'bloqueado';
    database.ref('produtos/' + id).update({ status: novoStatus })
    .then(() => {
        console.log("Status atualizado com sucesso!");
    });
}
// 4. PROCESSAMENTO DE NOVOS ITENS (CADASTRO)
// ================================================================

document.getElementById('form-cadastro').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('nome-brinquedo').value;
    const imagem = document.getElementById('imagem-brinquedo').value;
    const valorRaw = document.getElementById('valor-brinquedo').value;
    const categoria = document.getElementById('prod-categoria').value; 
    const estoqueTotal = parseInt(document.getElementById('prod-estoque').value) || 1;

    // Converte valor para número para cálculos financeiros
    const valorNumerico = parseFloat(valorRaw.replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0;

    const novoProduto = {
        nome: nome,
        imagem: imagem,
        valor: valorNumerico,
        categoria: categoria,
        estoque_total: estoqueTotal,
        status: "ativo", // Todo produto começa ativo por padrão
        timestamp: Date.now()
    };

    database.ref('produtos').push(novoProduto).then(() => {
        alert("Produto cadastrado com sucesso!");
        fecharModal();
        document.getElementById('form-cadastro').reset();
    });
});

// ================================================================
// 5. FLUXO DE RESERVAS
// ================================================================

// ABA 1: Pendentes (Borda Amarela + Imagem + Mensagem)
function carregarSolicitacoes() {
    const container = document.getElementById('lista-solicitacoes-pendentes');
    const badge = document.getElementById('badge-notificacao');
    if (!container) return;

    database.ref('solicitacoes').on('value', snapshot => {
        container.innerHTML = ""; 
        const solicitacoes = snapshot.val();
        let pendentesContador = 0;

        if (!solicitacoes) {
            container.innerHTML = "<p class='aviso'>Nenhuma solicitação pendente.</p>";
            if (badge) badge.style.display = "none";
            return;
        }

        const listaIds = Object.keys(solicitacoes).reverse();

        listaIds.forEach(id => {
            const s = solicitacoes[id];

            if (s.status === "pendente") {
                pendentesContador++;

                database.ref('produtos/' + s.produto_id).once('value', prodSnap => {
                    const p = prodSnap.val();
                    
                    // 1. Definição da Foto
                    let fotoExibicao = 'https://via.placeholder.com/300x180?text=Brinquedo';
                    if (p && p.imagem) {
                        fotoExibicao = p.imagem.split(',')[0];
                    } else if (s.imagem) {
                        fotoExibicao = s.imagem;
                    }

                    // 2. Definição das variáveis de texto (IMPORTANTE: Definir antes de usar nos links)
                    const tel = s.telefone_cliente || s.cliente_fone || s.whatsapp || "";
                    const nomeCliente = s.nome_cliente || s.cliente_nome || "Cliente";
                    const endereco = s.endereco_completo || s.cliente_endereco || "Não informado";

                    // 3. Criação dos Links (WhatsApp e Google Maps)
                    const linkWhats = `https://wa.me/55${tel.replace(/\D/g, '')}`;
                    const linkMapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;

                    const cardHTML = `
                        <div class="card-padrao" style="border-top: 5px solid #f1c40f;">
                            <img src="${fotoExibicao}" class="img-card">
                            
                            <div class="conteudo-card">
                                <div style="display:flex; justify-content:space-between; align-items: center; margin-bottom: 8px;">
                                    <span class="tag-categoria">${s.categoria || 'PENDENTE'}</span>
                                    <small style="color: #666;">${s.timestamp ? new Date(s.timestamp).toLocaleDateString() : ''}</small>
                                </div>

                                <h3>${s.nome_produto || 'Produto'}</h3>
                                
                                <div class="contato-cliente">
                                    <p><strong><i class="fas fa-user"></i></strong> ${nomeCliente}</p>
                                    
                                    <p>
                                        <strong><i class="fas fa-map-marker-alt" style="color: #e74c3c;"></i></strong> 
                                        <a href="${linkMapa}" target="_blank" class="link-endereco" title="Abrir no Google Maps" style="text-decoration: none; color: #2980b9; font-weight: bold;">
                                            ${endereco}
                                        </a>
                                    </p>
                                    
                                    <a href="${linkWhats}" target="_blank" class="btn-whatsapp" >
                                        <i class="fab fa-whatsapp"></i> WhatsApp
                                    </a>
                                </div>

                                <div class="detalhes-info" style="margin-top: 10px; font-size: 0.9em; color: #555;">
                                    <i class="fas fa-calendar-alt"></i> ${s.data_inicio} até ${s.data_fim}
                                </div>

                                <div class="acoes-solicitacao">
                                    <button class="btn-confirmar" onclick="aprovarSolicitacao('${id}')" style="flex: 3;">
                                        <i class="fas fa-check"></i> Aprovar
                                    </button>
                                    <button class="btn-recusar" onclick="excluirItem('solicitacoes/${id}')" style="flex: 1;">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>`;
                    
                    container.insertAdjacentHTML('beforeend', cardHTML);
                });
            }
        });

        if (badge) {
            if (pendentesContador > 0) {
                badge.innerText = pendentesContador;
                badge.style.display = "inline-block";
            } else {
                badge.style.display = "none";
            }
        }
    });
}

// ABA 2: Agenda (Borda Verde + Imagem + Dados Restaurados)
function carregarAgenda() {
    const grid = document.getElementById('grid-reservas');
    if (!grid) return;

    database.ref('agendamentos').on('value', snapshot => {
        grid.innerHTML = "";
        const agendas = snapshot.val();
        if (!agendas) {
            grid.innerHTML = "<p class='aviso'>Nenhum agendamento ativo.</p>";
            return;
        }

        const listaIds = Object.keys(agendas).reverse();

        listaIds.forEach(idReserva => {
            const res = agendas[idReserva];
            
            if (res.status !== 'finalizada') {
                // BUSCA A FOTO NO CADASTRO DE PRODUTOS
                database.ref('produtos/' + res.produto_id).once('value', prodSnap => {
                    const p = prodSnap.val();
                    
                    let fotoExibicao = 'https://via.placeholder.com/300x180?text=Agendado';
                    if (p && p.imagem) {
                        fotoExibicao = p.imagem.split(',')[0];
                    } else if (res.imagem) {
                        fotoExibicao = res.imagem;
                    }

                    // 1. Definição das variáveis de texto
                    const tel = res.whatsapp || res.telefone_cliente || "";
                    const nomeCliente = res.cliente || res.nome_cliente || "Cliente";                    
                    const endereco = res.endereco || res.endereco_completo || res.cliente_endereco || "Endereço não encontrado";

                    // 2. Criação dos Links Clicáveis
                    const linkMapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
                    const linkWhats = `https://wa.me/55${tel.replace(/\D/g, '')}`;
                    
                    const cardHTML = `
                        <div class="card-padrao" style="border-top: 5px solid #28a745;">
                            <img src="${fotoExibicao}" class="img-card">
                            <div class="conteudo-card">
                                <span class="tag-categoria">RESERVA ATIVA</span>
                                <h3>${res.nome_produto || 'Produto'}</h3>
                                
                                <div class="contato-cliente">
                                    <p><strong><i class="fas fa-user"></i></strong> ${nomeCliente}</p>
                                    
                                   <p>
                                        <strong><i class="fas fa-map-marker-alt" style="color: #e74c3c;";"></i></strong> 
                                        <a href="${linkMapa}" target="_blank" style="text-decoration: none; color: #2980b9; font-weight: bold;">
                                            ${endereco}
                                        </a>
                                    </p>
                                    
                                    <a href="${linkWhats}" target="_blank" class="btn-whatsapp">
                                        <i class="fab fa-whatsapp"></i> WhatsApp
                                    </a>
                                </div>

                                <div class="detalhes-info" style="margin-top: 10px; font-size: 0.9em; color: #555;">
                                    <p><strong><i class="fas fa-calendar-check"></i></strong> ${res.data_inicio} até ${res.data_fim}</p>
                                </div>

                                <button onclick="liberarEFinalizar('${idReserva}', '${res.solicitacao_id || ''}')" class="btn-confirmar">
                                    Finalizar e Liberar Estoque
                                </button>
                            </div>
                        </div>`;
                    
                    grid.insertAdjacentHTML('beforeend', cardHTML);
                });
            }
        });
    });
}

// ABA 3: Histórico (Borda Cinza + Imagem P&B)
function carregarHistorico() {
    const grid = document.getElementById('grid-historico');
    if (!grid) return;

    database.ref('solicitacoes').on('value', snapshot => {
        grid.innerHTML = "";
        const dados = snapshot.val();
        if (!dados) {
            grid.innerHTML = "<p class='aviso'>Histórico vazio.</p>";
            return;
        }

        // Mostra os concluídos mais recentes no topo
        const listaIds = Object.keys(dados).reverse();

        listaIds.forEach(id => {
            const h = dados[id];
            
            if (h.status === "finalizada") {
                // BUSCA A FOTO NO CADASTRO DE PRODUTOS
                database.ref('produtos/' + h.produto_id).once('value', prodSnap => {
                    const p = prodSnap.val();
                    
                    let fotoExibicao = 'https://via.placeholder.com/300x180?text=Concluído';
                    if (p && p.imagem) {
                        fotoExibicao = p.imagem.split(',')[0];
                    } else if (h.imagem) {
                        fotoExibicao = h.imagem;
                    }

                    // 1. Definição das variáveis de texto
                    const tel = h.telefone_cliente || h.whatsapp || "";
                    const nomeCliente = h.nome_cliente || h.cliente_nome || "Cliente";
                    const endereco = h.endereco_completo || h.cliente_endereco || "Sem endereço";

                    // 2. Criação dos Links (Maps e WhatsApp)
                    const linkMapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
                    const linkWhats = `https://wa.me/55${tel.replace(/\D/g, '')}`;

                    const cardHTML = `
                        <div class="card-padrao" style="border-top: 5px solid #bdc3c7; opacity: 0.85;">
                            <img src="${fotoExibicao}" class="img-card" style="filter: grayscale(0.8);">
                            <div class="conteudo-card">
                                <span class="tag-categoria" style="background: #7f8c8d;">CONCLUÍDO</span>
                                <h3>${h.nome_produto || 'Produto'}</h3>
                                
                                <div class="contato-cliente" style="font-size: 0.9em;">
                                    <p><strong><i class="fas fa-user"></i></strong> ${nomeCliente}</p>
                                    
                                    <p>
                                        <strong><i class="fas fa-map-marker-alt" style="color: #95a5a6;"></i></strong> 
                                        <a href="${linkMapa}" target="_blank" style="text-decoration: none; color: #7f8c8d; font-weight: bold;">
                                            ${endereco}
                                        </a>
                                    </p>

                                    <a href="${linkWhats}" target="_blank" class="btn-whatsapp">
                                        <i class="fab fa-whatsapp"></i> Ver Contato
                                    </a>
                                </div>

                                <p style="font-size: 0.8em; color: #666; margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                                    <i class="fas fa-check-double"></i> Finalizado em: ${h.data_finalizacao ? new Date(h.data_finalizacao).toLocaleDateString() : '---'}
                                </p>
                            </div>
                        </div>`;
                    
                    grid.insertAdjacentHTML('beforeend', cardHTML);
                });
            }
        });
    });
}

// ================================================================
// 6. FUNÇÕES DE TRANSIÇÃO DE STATUS
// ================================================================
// FUNÇÃO DE APROVAÇÃO (CORRIGIDA COM WHATSAPP)
function aprovarSolicitacao(idSolicitacao) {
    database.ref('solicitacoes/' + idSolicitacao).once('value', snapshot => {
        const dados = snapshot.val();
        if (!dados) return;

        const novoAgendamento = {
            produto_id: dados.produto_id || "",
            nome_produto: dados.nome_produto || "Produto",
            data_inicio: dados.data_inicio,
            data_fim: dados.data_fim,
            cliente: dados.nome_cliente || dados.cliente_nome || "Cliente",
            endereco: dados.endereco_completo || dados.cliente_endereco || dados.endereco || "Não informado",            
            whatsapp: dados.telefone_cliente || dados.cliente_fone || dados.whatsapp || "",
            imagem: dados.imagem || "", 
            solicitacao_id: idSolicitacao,
            status: "confirmado"
        };

        database.ref('agendamentos').push(novoAgendamento).then(() => {
            // 1. Atualiza status no banco
            database.ref('solicitacoes/' + idSolicitacao).update({ 
                status: "agendado",
                valor_produto: dados.valor_produto || dados.valor || 0 
            });

            // 2. MONTAGEM DA MENSAGEM DO WHATSAPP
            const msg = `Olá *${novoAgendamento.cliente}*! Sua reserva do item *${novoAgendamento.nome_produto}* foi *APROVADA*! 🎉%0A%0A` +
                        `*Período:* ${novoAgendamento.data_inicio.split('-').reverse().join('/')} até ${novoAgendamento.data_fim.split('-').reverse().join('/')}%0A` +
                        `*Endereço:* ${novoAgendamento.endereco}%0A%0A` +
                        `Já estamos preparando tudo por aqui!`;

            const foneLimpo = novoAgendamento.whatsapp.replace(/\D/g, "");
            
            // Verifica se precisa adicionar o 55 (Brasil)
            const linkWhats = `https://wa.me/${foneLimpo.length <= 11 ? '55' + foneLimpo : foneLimpo}?text=${msg}`;

            // 3. Abre o WhatsApp e avisa o usuário
            window.open(linkWhats, '_blank');
            alert("Reserva aprovada e WhatsApp aberto!");
        });
    });
}

function liberarEFinalizar(idReserva, idSolicitacao) {
    if (!confirm("Finalizar locação?")) return;

    // Atualiza o agendamento para liberar o estoque (nosso calculo ignora 'finalizada')
    database.ref('agendamentos/' + idReserva).update({
        status: "finalizada",
        finalizado_em: Date.now()
    });

    // Atualiza a solicitação para alimentar o Histórico e Financeiro
    if (idSolicitacao) {
        database.ref('solicitacoes/' + idSolicitacao).update({ 
            status: "finalizada",
            data_finalizacao: Date.now() 
        });
    }
    alert("Finalizado com sucesso!");
}

function excluirItem(caminho) {
    if(confirm("Excluir permanentemente?")) {
        database.ref(caminho).remove();
    }
}

// ================================================================
// 7. PAINEL FINANCEIRO E RELATÓRIOS
// ================================================================

let meuGrafico = null; // Variável global para controlar o gráfico

function carregarRelatorioFinanceiro() {
    const mesFiltro = document.getElementById('filtro-mes-financeiro').value;
    const corpoTabela = document.getElementById('tabela-corpo-financas');
    const faturamentoTxt = document.getElementById('faturamento-valor');
    const totalConcluidasTxt = document.getElementById('total-concluidas');

    database.ref('solicitacoes').orderByChild('status').equalTo('finalizada').on('value', snapshot => {
        const dados = snapshot.val();
        corpoTabela.innerHTML = "";
        
        if (!dados) {
            faturamentoTxt.innerText = "R$ 0,00";
            totalConcluidasTxt.innerText = "0";
            return;
        }

        let faturamentoTotal = 0;
        let qtdTotal = 0;
        let produtosResumo = {};

        Object.keys(dados).forEach(id => {
            const h = dados[id];
            
            // Filtro de data
            if (h.data_finalizacao) {
                const dataFinalizacao = new Date(h.data_finalizacao);
                const mesAnoFinalizado = dataFinalizacao.toISOString().substring(0, 7);
                if (mesFiltro && mesAnoFinalizado !== mesFiltro) return;
            }

            // CORREÇÃO AQUI: Tenta ler valor_produto, se não houver, tenta h.valor
            const valor = parseFloat(h.valor_produto) || parseFloat(h.valor) || 0;
            
            faturamentoTotal += valor;
            qtdTotal++;

            if (!produtosResumo[h.nome_produto]) {
                produtosResumo[h.nome_produto] = { qtd: 0, total: 0 };
            }
            produtosResumo[h.nome_produto].qtd++;
            produtosResumo[h.nome_produto].total += valor;
        });

        faturamentoTxt.innerText = faturamentoTotal.toLocaleString('pt-br',{style: 'currency', currency: 'BRL'});
        totalConcluidasTxt.innerText = qtdTotal;

        Object.keys(produtosResumo).forEach(nome => {
            const item = produtosResumo[nome];
            corpoTabela.innerHTML += `
                <tr>
                    <td><strong>${nome}</strong></td>
                    <td>${item.qtd}x</td>
                    <td>R$ ${item.total.toFixed(2)}</td>
                </tr>`;
        });

        if (typeof atualizarGrafico === "function") {
            atualizarGrafico(produtosResumo);
        }
    });
}

function atualizarGrafico(resumo) {
    const ctx = document.getElementById('graficoDesempenho').getContext('2d');
    
    // Se já existir um gráfico, destrói para criar o novo (evita sobreposição)
    if (meuGrafico) meuGrafico.destroy();

    meuGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(resumo),
            datasets: [{
                label: 'Faturamento por Item (R$)',
                data: Object.values(resumo).map(i => i.total),
                backgroundColor: '#0056b3',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function limparFiltroFinancas() {
    document.getElementById('filtro-mes-financeiro').value = "";
    carregarRelatorioFinanceiro();
}
 Object.keys(dados).forEach(id => {
    const p = dados[id];
    const isBloqueado = p.status === 'bloqueado';
    
    grid.innerHTML += `
        <div class="card-padrao ${isBloqueado ? 'bloqueado' : ''}">
            <img src="${p.imagem}" class="img-card">
            <div class="conteudo-card">
                <span class="tag-categoria">${p.categoria}</span>
                <h3>${p.nome}</h3>
                <div class="acoes-card" style="flex-direction: column;">
                    ${isBloqueado 
                        ? `<button class="btn-ativar" onclick="alternarStatus('${id}', 'ativo')"><i class="fas fa-eye"></i> Ativar no Catálogo</button>`
                        : `<button class="btn-bloquear" onclick="alternarStatus('${id}', 'bloqueado')"><i class="fas fa-eye-slash"></i> Bloquear Item</button>`
                    }
                    <button class="btn-lixo" style="margin-top:10px" onclick="excluirItem('produtos/${id}')">Excluir Permanente</button>
                </div>
            </div>
        </div>`;
});


function alternarStatus(id, novoStatus) {
    database.ref('produtos/' + id).update({ status: novoStatus })
    .then(() => alert("Status atualizado!"));
}
