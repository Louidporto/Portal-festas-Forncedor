// 1. CONFIGURAÇÃO FIREBASE (Substitua pelos seus dados se necessário)
const firebaseConfig = {
    apiKey: "AIzaSyD-m-zKJEmhi9GJ-52VZ_tMjFUVELQz4VQ",
    authDomain: "camaelasticaapp.firebaseapp.com",
    databaseURL: "https://camaelasticaapp-default-rtdb.firebaseio.com", 
    projectId: "camaelasticaapp",
    storageBucket: "camaelasticaapp.firebasestorage.app",
    messagingSenderId: "995476566915",
    appId: "1:995476566915:web:ceb35ea886fedb9a4d7cb6"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const form = document.getElementById('form-aluguel');
const listaCards = document.getElementById('lista-agendamentos');
const listaHistorico = document.getElementById('lista-historico');

// Auxiliar: Formatar Data
function formatarData(data) {
    if(!data) return "";
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
}

// 2. ESCUTAR RESERVAS ATIVAS (Garante que apareça ao carregar)
database.ref('alugueis').on('value', (snapshot) => {
    const dados = snapshot.val();
    const listaCards = document.getElementById('lista-agendamentos');
    listaCards.innerHTML = ""; 
    
    if (dados) {
        // Converte o objeto em array e ordena por data
        const listaOrdenada = Object.values(dados).sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
        
        listaOrdenada.forEach(aluguel => {
            criarCardNaTela(aluguel);
        });
    } else {
        listaCards.innerHTML = "<p style='text-align:center; color:#999;'>Nenhuma reserva ativa encontrada.</p>";
    }
});
// 3. ESCUTAR HISTÓRICO
database.ref('historico').on('value', (snapshot) => {
    const dados = snapshot.val();
    listaHistorico.innerHTML = "";
    if (dados) {
        Object.values(dados).reverse().forEach(h => criarCardHistorico(h));
    }
});

// 4. CADASTRO DE RESERVA
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const novoAluguel = {
        id: Date.now(),
        cliente: document.getElementById('cliente').value,
        descricao: document.getElementById('descricao').value,
        telefone: document.getElementById('telefone').value,
        precoDia: parseFloat(document.getElementById('preco-dia').value),
        dataInicio: document.getElementById('data-inicio').value,
        dataFim: document.getElementById('data-fim').value
    };

    // Validação de Conflito
    const snapshot = await database.ref('alugueis').once('value');
    const existentes = snapshot.val();
    let temConflito = false;

    if (existentes) {
        for (let id in existentes) {
            const a = existentes[id];
            if (novoAluguel.dataInicio <= a.dataFim && novoAluguel.dataFim >= a.dataInicio) {
                temConflito = true;
                alert(`⚠️ Conflito com reserva de ${a.cliente}`);
                break;
            }
        }
    }

    if (!temConflito) {
        await database.ref('alugueis/' + novoAluguel.id).set(novoAluguel);
        form.reset();
    }
});

// 5. DESENHAR CARD ATIVO
function criarCardNaTela(aluguel) {
    const card = document.createElement('div');
    card.className = 'card-aluguel';

    const d1 = new Date(aluguel.dataInicio + "T00:00:00");
    const d2 = new Date(aluguel.dataFim + "T00:00:00");
    const dias = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    const total = dias * aluguel.precoDia;
    const telLimpo = aluguel.telefone.replace(/\D/g, '');

    card.innerHTML = `
        <div class="status-barra ocupado"></div>
        <div class="card-info">
            <h4>${aluguel.cliente}</h4>
            <p style="font-size:12px; color:#666;">${aluguel.descricao}</p>
            <a href="https://wa.me/55${telLimpo}" target="_blank" class="btn-whatsapp">📱 WhatsApp</a>
            <p><b>Período:</b> ${formatarData(aluguel.dataInicio)} - ${formatarData(aluguel.dataFim)}</p>
            <p><b>Total:</b> R$ ${total.toFixed(2)}</p>
        </div>
        <button class="btn-cancelar" onclick="finalizarReserva(${aluguel.id})">Finalizar Aluguel</button>
    `;
    listaCards.appendChild(card);
}

// 6. FINALIZAR E MOVER PARA HISTÓRICO
async function finalizarReserva(id) {
    if(confirm("Deseja arquivar esta reserva no histórico?")) {
        const snapshot = await database.ref('alugueis/' + id).once('value');
        const dados = snapshot.val();
        
        await database.ref('historico/' + id).set({
            ...dados,
            finalizadoEm: new Date().toISOString()
        });
        
        await database.ref('alugueis/' + id).remove();
    }
}

// 7. DESENHAR CARD HISTÓRICO
function criarCardHistorico(h) {
    const card = document.createElement('div');
    card.className = 'card-aluguel historico-item';
    card.innerHTML = `
        <div class="card-info">
            <span class="tag-finalizado">Finalizado</span>
            <h4>${h.cliente}</h4>
            <p>${h.descricao} | Finalizado em: ${formatarData(h.finalizadoEm.split('T')[0])}</p>
        </div>
    `;
    listaHistorico.appendChild(card);
}

// 8. FUNÇÃO DE BUSCA ATUALIZADA
function filtrarClientes() {
    const buscaInput = document.getElementById('busca-cliente');
    const termo = buscaInput.value.toLowerCase();
    
    // Seleciona todos os cards dentro da lista de agendamentos
    const cards = document.querySelectorAll('#lista-agendamentos .card-aluguel');
    
    cards.forEach(card => {
        // Busca o nome dentro do H4 do card
        const nomeNoCard = card.querySelector('h4').innerText.toLowerCase();
        
        if (nomeNoCard.includes(termo)) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });
}
function limparBusca() {
    document.getElementById('busca-cliente').value = "";
    filtrarClientes();
}















