<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Avaliação Manual — Nibo CS Auditor</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        /* ── Nibo Design Tokens ─────────────────────────────────────────────────── */
        :root {
            --nibo-purple:   #6431e2;
            --nibo-purple-h: #5229c5;
            --nibo-blue:     #0072ce;
            --nibo-blue-lt:  #41b6e6;
            --nibo-petroleo: #002d72;
            --nibo-ice:      #b8ccea;
            --nibo-bg:       #eef2f8;
            --nibo-text:     #0d1b3e;
            --nibo-muted:    #4a5773;
        }
        body { font-family: 'Roca', 'Poppins', 'Helvetica Neue', Helvetica, sans-serif; background-color: var(--nibo-bg); color: var(--nibo-text); }
        h1,h2,h3,h4,h5,h6 { font-family: 'Roca', 'Poppins', 'Helvetica Neue', Helvetica, sans-serif; }
        .glass-card { background: white; border: 1px solid #d8e2f0; border-radius: 2.5rem; box-shadow: 0 10px 15px -3px rgba(0,45,114,0.06); transition: all 0.3s ease; }
        .glass-card:hover { box-shadow: 0 20px 25px -5px rgba(100,49,226,0.12); }
        @keyframes pulse-opacity { 0%,100%{opacity:1} 50%{opacity:.4} }
        .pulse-text { animation: pulse-opacity 1.8s ease-in-out infinite; }
        .markdown-content h1, .markdown-content h2 { font-family:'Roca','Poppins',sans-serif;font-weight:800;color:var(--nibo-petroleo);margin-top:1.5rem;margin-bottom:0.75rem;font-size:1rem;text-transform:uppercase;border-bottom:2px solid var(--nibo-purple);padding-bottom:0.5rem; }
        .markdown-content p { margin-bottom:1rem;color:var(--nibo-muted);line-height:1.7;font-size:0.9rem; }
        .markdown-content ul { list-style-type:none;padding-left:0;margin-bottom:1.25rem; }
        .markdown-content li { position:relative;padding-left:1.5rem;margin-bottom:0.4rem;color:var(--nibo-muted);font-size:0.85rem; }
        .markdown-content li::before { content:"•";position:absolute;left:0;color:var(--nibo-purple);font-weight:bold; }
        select { background-image:url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");background-repeat:no-repeat;background-position:right 0.5rem center;background-size:1.5em 1.5em;padding-right:2.5rem; }
        /* banner de sucesso ao salvar */
        #save-banner { display:none;position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:200;background:#059669;color:white;padding:0.75rem 1.5rem;border-radius:1rem;font-weight:700;font-size:0.875rem;box-shadow:0 8px 24px rgba(0,0,0,0.2);display:none;align-items:center;gap:0.5rem; }
        #save-banner.visible { display:flex; }
    </style>
</head>
<body class="pb-20 antialiased">

<!-- Banner de salvo -->
<div id="save-banner">
    <i data-lucide="check-circle" class="w-4 h-4"></i>
    <span id="save-banner-text">Análise salva com sucesso!</span>
    <a href="/" class="ml-2 underline text-emerald-100 hover:text-white">Ver no Dashboard →</a>
</div>

<nav class="text-white py-4 px-8 sticky top-0 z-50 shadow-xl" style="background:linear-gradient(90deg,#002d72 0%,#3a1fa8 60%,#6431e2 100%);border-bottom:1px solid rgba(65,182,230,0.3)">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-3">
            <div class="bg-white p-2.5 rounded-2xl shadow-inner">
                <i data-lucide="headset" class="w-6 h-6" style="color:#6431e2"></i>
            </div>
            <div>
                <h1 class="font-extrabold text-lg uppercase tracking-tight">Nibo <span style="color:#41b6e6">Auditor de CS</span></h1>
                <p class="text-[9px] uppercase tracking-widest font-bold mt-1" style="color:#b8ccea">Análise de Implementação e Onboarding 📱</p>
            </div>
        </div>
        <div class="flex items-center gap-4 flex-wrap justify-center md:justify-end">
            <div id="analista-badge" class="hidden items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold" style="background:rgba(16,185,129,0.25);border-color:rgba(16,185,129,0.4);color:#a7f3d0">
                <i data-lucide="user-check" class="w-4 h-4"></i>
                <span id="analista-badge-nome">—</span>
            </div>
            <div class="relative">
                <i data-lucide="shield" class="absolute left-3 top-2.5 w-4 h-4" style="color:#b8ccea"></i>
                <select id="coordinator-select"
                    class="pl-10 pr-5 py-2 rounded-xl text-white text-sm focus:outline-none transition-all cursor-pointer" style="background:rgba(100,49,226,0.35);border:1px solid rgba(65,182,230,0.3)">
                    <option value="">Coordenador (opcional)</option>
                    <option value="Sayuri">Sayuri</option>
                    <option value="Tayanara">Tayanara</option>
                    <option value="Túlio">Túlio</option>
                    <option value="Michel">Michel</option>
                    <option value="Jéssica">Jéssica</option>
                </select>
            </div>
            <a href="/" class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-sm font-bold transition-all shadow" style="color:#002d72" onmouseover="this.style.background='#ede9ff'" onmouseout="this.style.background='white'">
                <i data-lucide="bar-chart-3" class="w-4 h-4"></i>
                ← Dashboard 📊
            </a>
        </div>
    </div>
</nav>

<main class="max-w-7xl mx-auto px-4 mt-8">

    <section class="mb-10">
        <div class="glass-card p-8 md:p-10">
            <div class="flex items-center gap-3 mb-6">
                <i data-lucide="message-square" style="color:#6431e2"></i>
                <h2 class="font-bold text-slate-800 text-lg">Submeter Transcrição do Cliente</h2>
            </div>
            <div class="flex items-start gap-3 mb-5 p-4 rounded-2xl border" style="background:#ede9ff;border-color:#c4b5fd">
                <i data-lucide="info" class="w-4 h-4 mt-0.5 flex-shrink-0" style="color:#6431e2"></i>
                <p class="text-xs font-medium" style="color:#5229c5">💡 O nome do analista será detectado automaticamente pela IA a partir da transcrição. O coordenador é opcional.</p>
            </div>
            <textarea id="transcript-input" rows="6"
                class="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:outline-none transition-all text-sm resize-none"
                placeholder="Cole aqui o diálogo da reunião de Onboarding..."></textarea>
            <div class="flex items-center justify-between mt-3 mb-6 px-1">
                <div class="text-[11px] font-bold text-slate-400"><span id="char-count">0</span> caracteres</div>
                <label class="text-[11px] font-bold text-slate-400 cursor-pointer transition-colors flex items-center gap-2" style="hover-color:#6431e2" onmouseover="this.style.color='#6431e2'" onmouseout="this.style.color=''">
                    <i data-lucide="upload-cloud" class="w-4 h-4"></i>
                    Ou carregar PDF 📄
                    <input type="file" id="pdf-upload" accept=".pdf" class="hidden" />
                </label>
            </div>
            <div class="flex justify-end">
                <button id="analyze-btn"
                    class="flex items-center gap-3 text-white px-10 py-4 rounded-2xl font-bold text-sm shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" style="background:#6431e2;font-family:'Poppins',sans-serif;font-weight:600" onmouseover="this.style.background='#002d72'" onmouseout="this.style.background='#6431e2'">
                    <span id="btn-text">Analisar Sucesso do Cliente 🚀</span>
                    <i data-lucide="zap" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    </section>

    <div id="results-section" class="hidden space-y-8">

        <!-- Loading -->
        <div id="loading-spinner" class="glass-card p-12">
            <div class="max-w-lg mx-auto space-y-6">
                <div id="step-scores" class="flex items-center gap-4 transition-opacity duration-500">
                    <div id="step-scores-icon" class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style="background:#ede9ff">
                        <i data-lucide="bar-chart-2" class="w-4 h-4" style="color:#6431e2"></i>
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">
                            <span>📊 Avaliando os 17 pilares</span><span id="step-scores-pct">—</span>
                        </div>
                        <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div id="bar-scores" class="h-full rounded-full transition-all duration-500" style="width:0%;background:linear-gradient(90deg,#6431e2,#0072ce)"></div>
                        </div>
                    </div>
                </div>
                <div id="step-report" class="flex items-center gap-4 opacity-30 transition-opacity duration-500">
                    <div id="step-report-icon" class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style="background:#e6f3ff">
                        <i data-lucide="scroll-text" class="w-4 h-4" style="color:#0072ce"></i>
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">
                            <span>📝 Gerando relatório de auditoria</span><span id="step-report-pct">—</span>
                        </div>
                        <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div id="bar-report" class="h-full rounded-full transition-all duration-500" style="width:0%;background:#0072ce"></div>
                        </div>
                    </div>
                </div>
            </div>
            <p id="loading-label" class="text-center text-slate-400 font-bold text-xs uppercase tracking-widest mt-10 pulse-text">Iniciando...</p>
        </div>

        <!-- Resultado -->
        <div id="analysis-content" class="hidden space-y-8">

            <!-- Analista identificado -->
            <div id="analista-resultado" class="hidden glass-card p-6 border-l-4 border-emerald-500 flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-xl font-black text-emerald-600" id="analista-inicial">?</div>
                <div class="flex-1">
                    <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Analista Identificado pela IA</p>
                    <p id="analista-nome-resultado" class="text-lg font-extrabold text-[#002d72]">—</p>
                    <p id="analista-coord-resultado" class="text-xs text-slate-500">—</p>
                </div>
                <!-- Botão "Ver no Dashboard" após salvar -->
                <a id="btn-ver-dashboard" href="/" class="hidden flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all">
                    <i data-lucide="bar-chart-3" class="w-4 h-4"></i>Ver no Dashboard
                </a>
            </div>

            <!-- Cliente Avaliado -->
            <div id="cliente-card" class="hidden glass-card p-6 flex flex-col md:flex-row items-start md:items-center gap-5" style="border-left:6px solid #41b6e6">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style="background:linear-gradient(135deg,#e6f3ff,#ede9ff)">
                    <i data-lucide="building-2" class="w-6 h-6" style="color:#0072ce"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Cliente Avaliado 🏢</p>
                    <p id="cliente-nome-display" class="text-2xl font-extrabold truncate" style="color:#002d72">—</p>
                </div>
                <div class="flex items-center gap-3 flex-wrap">
                    <div id="produto-badge" class="hidden items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest" style="background:#ede9fe;color:#6431e2">
                        <i data-lucide="package" class="w-3 h-3"></i>
                        <span id="produto-badge-label">—</span>
                    </div>
                    <div id="churn-badge" class="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                        <span id="churn-badge-dot" class="w-2 h-2 rounded-full inline-block"></span>
                        <span id="churn-badge-label">Churn —</span>
                    </div>
                    <div id="saude-badge" class="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest" style="background:#dcfce7;color:#166534">
                        <i data-lucide="heart-pulse" class="w-3 h-3"></i>
                        <span id="saude-badge-label">Saúde —</span>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div class="lg:col-span-1 glass-card p-10 flex flex-col items-center justify-center text-center" style="border-bottom:10px solid #6431e2">
                    <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Média de CS (Máx 5) 🏆</span>
                    <div id="media-final" class="text-7xl font-black mb-3" style="color:#002d72">0.0</div>
                    <div id="status-tag" class="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">---</div>
                </div>
                <div class="lg:col-span-3 glass-card p-10 text-white flex flex-col justify-center" style="background:linear-gradient(135deg,#6431e2 0%,#002d72 60%,#41b6e6 100%)">
                    <div id="concorrentes-tags" class="flex flex-wrap gap-2 mb-4"></div>
                    <h3 class="font-bold text-[10px] uppercase tracking-widest mb-4" style="color:#b8ccea">Diagnóstico da Implementação 📱</h3>
                    <p id="resumo-text" class="text-xl md:text-2xl font-bold leading-tight mb-8"></p>
                    <div class="flex gap-4">
                        <div class="p-4 rounded-2xl border border-white/20 flex-1" style="background:rgba(255,255,255,0.1)">
                            <span class="text-[9px] font-black uppercase block mb-1 tracking-widest italic" style="color:#b8ccea">💡 Saúde do Cliente:</span>
                            <p id="saude-text" class="text-base font-bold text-white"></p>
                        </div>
                        <div class="p-4 rounded-2xl border border-red-400/30 flex-1" style="background:rgba(220,38,38,0.2)">
                            <span class="text-[9px] font-black text-red-300 uppercase block mb-1 tracking-widest italic">⚠️ Risco de Churn:</span>
                            <p id="churn-text" class="text-base font-bold text-white"></p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Saúde & Churn -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="glass-card p-8">
                    <h2 class="font-bold text-slate-800 mb-5 flex items-center gap-2">
                        <i data-lucide="heart-pulse" class="w-4 h-4 text-pink-500"></i>Saúde do Cliente
                    </h2>
                    <div class="grid grid-cols-2 gap-2">
                        <div id="sc-saudavel" class="rounded-2xl p-3 text-center border transition-all duration-300"><div class="text-2xl font-black" id="sc-saudavel-icon">—</div><div class="text-[9px] font-bold uppercase tracking-wide mt-0.5">Saudável</div></div>
                        <div id="sc-risco"    class="rounded-2xl p-3 text-center border transition-all duration-300"><div class="text-2xl font-black" id="sc-risco-icon">—</div><div class="text-[9px] font-bold uppercase tracking-wide mt-0.5">Em Risco</div></div>
                        <div id="sc-critico"  class="rounded-2xl p-3 text-center border transition-all duration-300"><div class="text-2xl font-black" id="sc-critico-icon">—</div><div class="text-[9px] font-bold uppercase tracking-wide mt-0.5">Crítico</div></div>
                        <div id="sc-nd"       class="rounded-2xl p-3 text-center border transition-all duration-300"><div class="text-2xl font-black" id="sc-nd-icon">—</div><div class="text-[9px] font-bold uppercase tracking-wide mt-0.5">Indefinido</div></div>
                    </div>
                </div>
                <div class="glass-card p-8">
                    <h2 class="font-bold text-slate-800 mb-5 flex items-center gap-2">
                        <i data-lucide="alert-circle" class="w-4 h-4 text-red-500"></i>Risco de Churn
                    </h2>
                    <div class="grid grid-cols-2 gap-2">
                        <div id="cc-alto"  class="rounded-2xl p-3 text-center border transition-all duration-300"><div class="text-2xl font-black" id="cc-alto-icon">—</div><div class="text-[9px] font-bold uppercase tracking-wide mt-0.5">Alto</div></div>
                        <div id="cc-medio" class="rounded-2xl p-3 text-center border transition-all duration-300"><div class="text-2xl font-black" id="cc-medio-icon">—</div><div class="text-[9px] font-bold uppercase tracking-wide mt-0.5">Médio</div></div>
                        <div id="cc-baixo" class="rounded-2xl p-3 text-center border transition-all duration-300"><div class="text-2xl font-black" id="cc-baixo-icon">—</div><div class="text-[9px] font-bold uppercase tracking-wide mt-0.5">Baixo</div></div>
                        <div id="cc-nd"    class="rounded-2xl p-3 text-center border transition-all duration-300"><div class="text-2xl font-black" id="cc-nd-icon">—</div><div class="text-[9px] font-bold uppercase tracking-wide mt-0.5">Indefinido</div></div>
                    </div>
                </div>
            </div>

            <div id="notas-grid" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 gap-4"></div>

            <!-- Sistemas / Ferramentas do Cliente -->
            <div id="sistemas-section" class="hidden glass-card p-8">
                <h3 class="font-bold text-slate-800 text-[14px] mb-6 flex items-center gap-3">
                    <i data-lucide="cpu" class="w-5 h-5" style="color:#41b6e6"></i>
                    🔗 Sistemas e Ferramentas Citados pelo Cliente
                </h3>
                <div id="sistemas-grid" class="flex flex-wrap gap-3"></div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="glass-card p-8 min-h-[400px] flex items-center justify-center">
                    <canvas id="radarChart"></canvas>
                </div>
                <div class="space-y-6">
                    <div class="glass-card p-8">
                        <h4 class="text-[10px] font-black uppercase text-slate-400 mb-8 tracking-widest">Tempo de Fala (Analista vs Cliente)</h4>
                        <div id="talk-time-container" class="space-y-8"></div>
                    </div>
                    <div class="glass-card p-8">
                        <h3 class="font-bold text-slate-800 text-[14px] mb-6 flex items-center gap-3">
                            <i data-lucide="list-checks" class="w-5 h-5" style="color:#6431e2"></i>✅ Checklist de Onboarding
                        </h3>
                        <div id="checklist-container" class="grid grid-cols-1 md:grid-cols-2 gap-3"></div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-emerald-50/60 p-8 rounded-[2rem] border border-emerald-100 shadow-sm">
                    <h4 class="text-[10px] font-black text-emerald-700 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <i data-lucide="trending-up" class="w-4 h-4"></i> Pontos Fortes
                    </h4>
                    <ul id="lista-fortes" class="space-y-3 text-[12px] font-bold text-emerald-900"></ul>
                </div>
                <div class="bg-amber-50/60 p-8 rounded-[2rem] border border-amber-100 shadow-sm">
                    <h4 class="text-[10px] font-black text-amber-700 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <i data-lucide="target" class="w-4 h-4"></i> Oportunidades de Melhoria
                    </h4>
                    <ul id="lista-atencao" class="space-y-3 text-[12px] font-bold text-amber-900"></ul>
                </div>
            </div>

            <!-- Bugs / Erros do Sistema -->
            <div id="bugs-section" class="hidden glass-card p-8" style="border-left:6px solid #f97316">
                <h3 class="font-bold text-orange-700 text-[14px] mb-2 flex items-center gap-3">
                    <i data-lucide="bug" class="w-5 h-5 text-orange-500"></i>
                    🐛 Bugs e Erros Detectados
                </h3>
                <p class="text-[11px] text-slate-500 mb-6">Problemas técnicos, falhas do sistema ou momentos em que o suporte precisou ser acionado.</p>
                <div id="bugs-grid" class="space-y-4"></div>
            </div>

            <!-- Sugestões de Melhoria de Produto -->
            <div id="melhorias-section" class="hidden glass-card p-8" style="border-left:6px solid #8b5cf6">
                <h3 class="font-bold text-purple-700 text-[14px] mb-2 flex items-center gap-3">
                    <i data-lucide="lightbulb" class="w-5 h-5 text-purple-500"></i>
                    💡 Sugestões de Melhoria de Produto
                </h3>
                <p class="text-[11px] text-slate-500 mb-6">Pedidos, ideias e feedbacks do cliente sobre funcionalidades, usabilidade, integrações e fluxos.</p>
                <div id="melhorias-grid" class="space-y-4"></div>
            </div>

            <!-- Desalinhamentos de Venda -->
            <div id="desalinhamentos-section" class="hidden glass-card p-8" style="border-left:6px solid #ef4444">
                <h3 class="font-bold text-red-700 text-[14px] mb-2 flex items-center gap-3">
                    <i data-lucide="alert-triangle" class="w-5 h-5 text-red-500"></i>
                    ⚠️ Desalinhamentos de Venda Detectados
                </h3>
                <p class="text-[11px] text-slate-500 mb-6">Momentos em que o cliente relatou discrepância entre o que foi prometido na venda e o que recebeu.</p>
                <div id="desalinhamentos-grid" class="space-y-4"></div>
            </div>

            <div class="glass-card p-12 md:p-16 shadow-2xl flex justify-between items-start" style="border-top:10px solid #6431e2">
                <div class="flex-1">
                    <h3 class="text-xl font-extrabold uppercase tracking-widest mb-10 border-b pb-6 flex items-center gap-4" style="color:#002d72;font-family:'Roca','Poppins',sans-serif">
                        <i data-lucide="scroll-text"></i>📊 Relatório de Auditoria de CS
                    </h3>
                    <div id="markdown-body" class="markdown-content"></div>
                </div>
                <div class="flex gap-2 ml-4">
                    <button id="export-pdf-btn" class="flex items-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all" title="Exportar como PDF">
                        <i data-lucide="file-pdf" class="w-4 h-4"></i>
                        <span class="hidden md:inline">PDF</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</main>

<!-- Modal pilar -->
<div id="justification-modal" class="fixed inset-0 z-[100] hidden items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity opacity-0">
    <div class="bg-white rounded-[2rem] p-8 max-w-sm w-full mx-4 shadow-2xl transform scale-95 transition-transform duration-300 flex flex-col" id="modal-content-box">
        <div class="flex justify-between items-start mb-6">
            <div>
                <span id="modal-title" class="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Pilar</span>
                <div id="modal-score" class="text-5xl font-black leading-none">0</div>
            </div>
            <button onclick="closeModal()" class="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-full text-slate-500 transition-colors">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>
        <div class="w-full h-px bg-slate-100 mb-6"></div>
        <div class="mb-5">
            <span class="text-[9px] font-bold uppercase text-slate-400 tracking-widest block mb-2">Justificativa da Nota</span>
            <p id="modal-text" class="text-[13px] text-slate-600 font-medium leading-relaxed"></p>
        </div>
        <div id="modal-improvement-container" class="rounded-2xl p-4 border mt-2">
            <div class="flex items-center gap-2 mb-2">
                <i id="modal-improvement-icon" data-lucide="target" class="w-4 h-4"></i>
                <span id="modal-improvement-label" class="text-[9px] font-bold uppercase tracking-widest block">O que faltou para o 5?</span>
            </div>
            <p id="modal-improvement-text" class="text-[12px] leading-relaxed font-medium"></p>
        </div>
    </div>
</div>

<!-- Modal PDF -->
<div id="pdf-viewer-modal" class="fixed inset-0 z-[100] hidden items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity opacity-0">
    <div class="bg-white rounded-[2rem] p-6 max-w-4xl w-full mx-4 shadow-2xl transform scale-95 transition-transform duration-300 flex flex-col max-h-[90vh]" id="pdf-viewer-content">
        <div class="flex justify-between items-center mb-4 sticky top-0 bg-white pb-4 border-b">
            <h2 class="text-lg font-black text-[#002d72] uppercase" id="pdf-title">PDF Viewer</h2>
            <button onclick="closePdfViewer()" class="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-full text-slate-500 transition-colors">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        <div id="pdf-container" class="flex-1 overflow-y-auto bg-slate-50 rounded-xl p-4">
            <div id="pdf-pages" class="space-y-4"></div>
            <p id="pdf-loading" class="text-center text-slate-500 py-8">Carregando PDF...</p>
        </div>
    </div>
</div>

<script>
lucide.createIcons();

// ── Mapeamento CS → Coordenador ─────────────────────────────────────────
const CS_TO_COORDINATOR = {
  'brayan santos':'Sayuri','brayan':'Sayuri','camille vaz':'Sayuri','camille':'Sayuri',
  'carolina miranda':'Sayuri','carolina':'Sayuri','isaque silva':'Sayuri','isaque':'Sayuri',
  'larissa mota':'Sayuri','nat vieira':'Sayuri','nat':'Sayuri','vinícius oliveira':'Sayuri','vinicius':'Sayuri',
  'ana de battisti':'Tayanara','ana battisti':'Tayanara',
  'denis silva':'Tayanara','denis':'Tayanara','larissa teixeira':'Tayanara',
  'lorrayne moreira':'Tayanara','lorrayne':'Tayanara','micaelle martins':'Tayanara','micaelle':'Tayanara',
  'sthephany talasca':'Tayanara','sthephany':'Tayanara','sthe':'Tayanara',
  'thais silva':'Tayanara','thais':'Tayanara','willian martins':'Tayanara','willian':'Tayanara',
  'yuri santos':'Tayanara','yuri':'Tayanara',
  'aline almeida':'Michel','aline':'Michel','bianca kim':'Michel','bianca':'Michel',
  'jéssica barreiro':'Michel','jessica barreiro':'Michel','jessica':'Michel',
  'julia rodrigues':'Michel','julia':'Michel','maria fernanda costa':'Michel','mafê':'Michel',
  'maryana alves':'Michel','maryana':'Michel','rafaele oliveira':'Michel','rafaele':'Michel',
  'túlio morgado':'Michel','túlio':'Michel','tulio':'Michel',
};

function detectLocalCS(transcript) {
    if(!transcript) return null;
    const lower=transcript.toLowerCase();
    for(const [name,coordinator] of Object.entries(CS_TO_COORDINATOR)){
        if(lower.includes(name)) return {nome:name,coordinator};
    }
    return null;
}

document.getElementById('transcript-input').addEventListener('paste',function(){
    setTimeout(()=>{
        const detected=detectLocalCS(this.value);
        if(detected){
            const sel=document.getElementById('coordinator-select');
            if(!sel.value) sel.value=detected.coordinator;
            showToast('✅ Coordenador detectado: '+detected.coordinator);
        }
    },100);
});

document.getElementById('transcript-input').addEventListener('input',()=>{
    document.getElementById('char-count').textContent=document.getElementById('transcript-input').value.length.toLocaleString('pt-BR');
});

// ── PDF ─────────────────────────────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

document.getElementById('pdf-upload').addEventListener('change',async function(e){
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=async function(event){
        const pdfData=new Uint8Array(event.target.result);
        openPdfViewer(pdfData,file.name);
        await extractPdfText(pdfData);
    };
    reader.readAsArrayBuffer(file);
});

async function extractPdfText(pdfData){
    try{
        const pdf=await pdfjsLib.getDocument({data:pdfData}).promise;
        let fullText='';
        for(let i=1;i<=pdf.numPages;i++){
            const page=await pdf.getPage(i);
            const content=await page.getTextContent();
            const pageText=content.items.map(item=>item.str).join(' ');
            fullText+=pageText+'\n';
        }
        const textarea=document.getElementById('transcript-input');
        textarea.value=fullText.trim();
        document.getElementById('char-count').textContent=textarea.value.length.toLocaleString('pt-BR');
        showToast('✅ Texto extraído do PDF com sucesso!','bg-emerald-600');
    }catch(e){
        showToast('⚠️ Não foi possível extrair texto do PDF.','bg-amber-500');
    }
}

async function openPdfViewer(pdfData,filename){
    document.getElementById('pdf-title').textContent=filename;
    document.getElementById('pdf-pages').innerHTML='';
    document.getElementById('pdf-loading').style.display='block';
    const modal=document.getElementById('pdf-viewer-modal');
    modal.classList.replace('hidden','flex');
    setTimeout(()=>{modal.classList.remove('opacity-0');document.getElementById('pdf-viewer-content').classList.replace('scale-95','scale-100');},10);
    try{
        const pdf=await pdfjsLib.getDocument({data:pdfData}).promise;
        for(let i=1;i<=pdf.numPages;i++){
            const page=await pdf.getPage(i);const canvas=document.createElement('canvas');
            const viewport=page.getViewport({scale:2});canvas.width=viewport.width;canvas.height=viewport.height;
            await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
            const div=document.createElement('div');div.className='bg-white rounded-lg shadow-md overflow-hidden';
            div.appendChild(canvas);document.getElementById('pdf-pages').appendChild(div);
        }
        document.getElementById('pdf-loading').style.display='none';
    }catch(e){
        document.getElementById('pdf-pages').innerHTML='<p class="text-red-600 font-bold">Erro ao carregar o PDF.</p>';
        document.getElementById('pdf-loading').style.display='none';
    }
}

function closePdfViewer(){
    const modal=document.getElementById('pdf-viewer-modal');
    modal.classList.add('opacity-0');document.getElementById('pdf-viewer-content').classList.replace('scale-100','scale-95');
    setTimeout(()=>modal.classList.replace('flex','hidden'),300);
}

// ── Toast ───────────────────────────────────────────────────────────────
function showToast(msg,color){
    color=color||'bg-emerald-500';
    const t=document.createElement('div');
    t.className=`fixed bottom-4 right-4 ${color} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-bold z-50 flex items-center gap-2`;
    t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3500);
}

// ── Pillar store ────────────────────────────────────────────────────────
const pillarStore={};let radarChartInstance=null;
const fields=[
    {l:'Consultividade',k:'consultividade'},{l:'Escuta Ativa',k:'escuta_ativa'},{l:'Jornada',k:'jornada_cliente'},
    {l:'Encantamento',k:'encantamento'},{l:'Objeções/Bugs',k:'objecoes'},{l:'Rapport',k:'rapport'},
    {l:'Autoridade',k:'autoridade'},{l:'Postura',k:'postura'},{l:'Gestão de Tempo',k:'gestao_tempo'},
    {l:'Contextualiz.',k:'contextualizacao'},{l:'Clareza',k:'clareza'},{l:'Objetividade',k:'objetividade'},
    {l:'Flexibilidade',k:'flexibilidade'},{l:'Dom. Produto',k:'dominio_produto'},{l:'Dom. Negócio',k:'dominio_negocio'},
    {l:'Ecossistema',k:'ecossistema_nibo'},{l:'Univ. Contábil',k:'universo_contabil'}
];

// ── Progress bars ───────────────────────────────────────────────────────
function animateTo(barId,pctId,target,durationMs){
    return new Promise(resolve=>{
        const bar=document.getElementById(barId),pct=document.getElementById(pctId);
        const start=parseFloat(bar.style.width)||0,steps=40,step=(target-start)/steps,delay=durationMs/steps;
        let cur=start,i=0;
        const t=setInterval(()=>{cur=Math.min(cur+step,target);bar.style.width=cur+'%';
            if(pct)pct.textContent=Math.round(cur)+'%';if(++i>=steps){clearInterval(t);resolve();}},delay);
    });
}
function markDone(iconId){
    const el=document.getElementById(iconId);
    if(el)el.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="w-4 h-4 text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>`;
}
function activate(rowId){document.getElementById(rowId)?.classList.remove('opacity-30');}
function setLabel(text){document.getElementById('loading-label').textContent=text;}

// ── ANÁLISE PRINCIPAL ───────────────────────────────────────────────────
const analyzeBtn=document.getElementById('analyze-btn');

async function handleAnalysis(){
    const prompt=document.getElementById('transcript-input').value.trim();
    if(!prompt){alert('Cole uma transcrição antes de analisar.');return;}
    const coordinator=document.getElementById('coordinator-select').value;

    document.getElementById('results-section').classList.remove('hidden');
    document.getElementById('loading-spinner').classList.remove('hidden');
    document.getElementById('analysis-content').classList.add('hidden');
    document.getElementById('analista-resultado').classList.add('hidden');
    document.getElementById('btn-ver-dashboard').classList.add('hidden');
    document.getElementById('save-banner').classList.remove('visible');
    ['bar-scores','bar-report'].forEach(id=>document.getElementById(id).style.width='0%');
    activate('step-scores');
    analyzeBtn.disabled=true;
    document.getElementById('btn-text').textContent='Analisando...';
    setLabel('Lendo transcrição e identificando o analista...');
    animateTo('bar-scores','step-scores-pct',88,25000);

    try{
        const response=await fetch('/api/analyze',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({prompt,coordinator})
        });
        let data;
        try{data=await response.json();}catch{throw new Error('Erro de comunicação com o servidor.');}
        if(data.error) throw new Error(data.error);

        await animateTo('bar-scores','step-scores-pct',100,300);
        markDone('step-scores-icon');activate('step-report');
        await animateTo('bar-report','step-report-pct',100,400);
        markDone('step-report-icon');
        setLabel('Análise concluída!');
        await new Promise(r=>setTimeout(r,500));

        // Mostra analista identificado
        const analistaNome=data.analista_nome||'Não identificado';
        const coordNome=data.coordinator||coordinator||'—';
        document.getElementById('analista-resultado').classList.remove('hidden');
        document.getElementById('analista-inicial').textContent=analistaNome[0]?.toUpperCase()||'?';
        document.getElementById('analista-nome-resultado').textContent=analistaNome;
        document.getElementById('analista-coord-resultado').textContent=coordNome!=='—'?`Coordenador: ${coordNome}`:'Coordenador não identificado';

        // Renderiza dashboard
        renderDashboard(data);

        // Salva no Supabase
        try{
            const saveRes=await fetch('/api/save',{
                method:'POST',headers:{'Content-Type':'application/json'},
                body:JSON.stringify({
                    analise:{...data,analista_nome:analistaNome},
                    coordenador:coordinator||null
                })
            });
            if(!saveRes.ok){
                const err=await saveRes.json().catch(()=>({}));
                console.warn('Aviso: análise não salva:',err.error||saveRes.status);
                showToast('⚠️ Análise exibida mas não salva no banco.','bg-amber-500');
            } else {
                // ✅ SUCESSO — mostra banner persistente e botão "Ver no Dashboard"
                const banner=document.getElementById('save-banner');
                document.getElementById('save-banner-text').textContent=`✅ ${analistaNome} salvo com sucesso!`;
                banner.classList.add('visible');
                document.getElementById('btn-ver-dashboard').classList.remove('hidden');
                // Esconde banner após 8s mas mantém botão
                setTimeout(()=>banner.classList.remove('visible'),8000);
            }
        }catch(e){
            console.warn('Aviso: erro ao salvar:',e.message);
            showToast('⚠️ Análise exibida mas não salva.','bg-amber-500');
        }

    }catch(err){
        alert('Erro na análise: '+err.message);
        document.getElementById('results-section').classList.add('hidden');
    }finally{
        analyzeBtn.disabled=false;
        document.getElementById('btn-text').textContent='Analisar Sucesso do Cliente';
    }
}

// ── Render Dashboard ────────────────────────────────────────────────────
function renderDashboard(data){
    document.getElementById('loading-spinner').classList.add('hidden');
    document.getElementById('analysis-content').classList.remove('hidden');

    const media=data.media_final||0;
    document.getElementById('media-final').textContent=media.toFixed(1);
    document.getElementById('resumo-text').textContent=data.resumo_executivo||'—';
    document.getElementById('saude-text').textContent=data.saude_cliente||'N/A';
    document.getElementById('churn-text').textContent=data.risco_churn||'N/A';
    document.getElementById('concorrentes-tags').innerHTML='';

    // ── Cliente card ─────────────────────────────────────────────────────
    const nomeCliente=data.nome_cliente||'Não identificado';
    document.getElementById('cliente-card').classList.remove('hidden');
    document.getElementById('cliente-nome-display').textContent=nomeCliente;

    // Churn badge (cor por palavra-chave)
    const churnTxt=(data.risco_churn||'').toLowerCase();
    const churnBadge=document.getElementById('churn-badge');
    const churnDot=document.getElementById('churn-badge-dot');
    const churnLabel=document.getElementById('churn-badge-label');
    if(/baixo|m[ií]nimo|saud[aá]vel|nenhum/.test(churnTxt)){
        churnBadge.style.cssText='background:#dcfce7;color:#166534;padding:0.5rem 1rem;border-radius:9999px;font-size:10px;font-weight:900;text-transform:uppercase;display:flex;align-items:center;gap:0.5rem;';
        churnDot.style.background='#22c55e'; churnLabel.textContent='Churn Baixo';
    } else if(/alto|cr[ií]tico|iminente|elevado/.test(churnTxt)){
        churnBadge.style.cssText='background:#fee2e2;color:#991b1b;padding:0.5rem 1rem;border-radius:9999px;font-size:10px;font-weight:900;text-transform:uppercase;display:flex;align-items:center;gap:0.5rem;';
        churnDot.style.background='#ef4444'; churnLabel.textContent='Churn Alto';
    } else if(/m[eé]dio|moderado|aten[çc][aã]o|risco/.test(churnTxt)){
        churnBadge.style.cssText='background:#fef3c7;color:#92400e;padding:0.5rem 1rem;border-radius:9999px;font-size:10px;font-weight:900;text-transform:uppercase;display:flex;align-items:center;gap:0.5rem;';
        churnDot.style.background='#f59e0b'; churnLabel.textContent='Churn Médio';
    } else {
        churnBadge.style.cssText='background:#dcfce7;color:#166534;padding:0.5rem 1rem;border-radius:9999px;font-size:10px;font-weight:900;text-transform:uppercase;display:flex;align-items:center;gap:0.5rem;';
        churnDot.style.background='#22c55e'; churnLabel.textContent='Churn Baixo';
    }

    // Saúde badge
    const saudeTxt=(data.saude_cliente||'').toLowerCase();
    const saudeBadge=document.getElementById('saude-badge');
    const saudeLabel=document.getElementById('saude-badge-label');
    if(/ruim|cr[ií]tico|insatisfeito|negativo|problema/.test(saudeTxt)){
        saudeBadge.style.cssText='background:#fee2e2;color:#991b1b;padding:0.5rem 1rem;border-radius:9999px;font-size:10px;font-weight:900;text-transform:uppercase;display:flex;align-items:center;gap:0.5rem;';
        saudeLabel.textContent='Saúde Crítica';
    } else if(/regular|aten[çc][aã]o|mediano|neutro/.test(saudeTxt)){
        saudeBadge.style.cssText='background:#fef3c7;color:#92400e;padding:0.5rem 1rem;border-radius:9999px;font-size:10px;font-weight:900;text-transform:uppercase;display:flex;align-items:center;gap:0.5rem;';
        saudeLabel.textContent='Saúde Regular';
    } else {
        saudeBadge.style.cssText='background:#dcfce7;color:#166534;padding:0.5rem 1rem;border-radius:9999px;font-size:10px;font-weight:900;text-transform:uppercase;display:flex;align-items:center;gap:0.5rem;';
        saudeLabel.textContent='Saúde Boa';
    }

    // ── Saúde & Churn — boxes visuais ────────────────────────────────────
    const saudeBoxes={
        saudavel:{id:'sc-saudavel',active:'bg-emerald-50 border-emerald-300 text-emerald-700',dim:'bg-slate-50 border-slate-200 text-slate-300',icon:'✅'},
        risco:   {id:'sc-risco',   active:'bg-amber-50 border-amber-300 text-amber-700',     dim:'bg-slate-50 border-slate-200 text-slate-300',icon:'⚠️'},
        critico: {id:'sc-critico', active:'bg-red-50 border-red-300 text-red-700',           dim:'bg-slate-50 border-slate-200 text-slate-300',icon:'🔴'},
        nd:      {id:'sc-nd',      active:'bg-slate-100 border-slate-300 text-slate-500',    dim:'bg-slate-50 border-slate-200 text-slate-300',icon:'❓'},
    };
    const saudeTxtLow=(data.saude_cliente||'').toLowerCase();
    const saudeKey=/ruim|cr[ií]tico|insatisf|negativo|problem/.test(saudeTxtLow)?'critico':
                   /regular|aten[çc]|mediano|neutro|risco/.test(saudeTxtLow)?'risco':
                   /bom|bem|positivo|saud[aá]vel|satisf/.test(saudeTxtLow)?'saudavel':'nd';
    Object.entries(saudeBoxes).forEach(([key,b])=>{
        const el=document.getElementById(b.id);
        const iconEl=document.getElementById(b.id+'-icon');
        const isActive=key===saudeKey;
        el.className=`rounded-2xl p-3 text-center border transition-all duration-300 ${isActive?b.active:b.dim}`;
        if(iconEl) iconEl.textContent=isActive?b.icon:'—';
    });

    const churnBoxes={
        alto:  {id:'cc-alto',  active:'bg-red-50 border-red-300 text-red-700',        dim:'bg-slate-50 border-slate-200 text-slate-300',icon:'🔴'},
        medio: {id:'cc-medio', active:'bg-amber-50 border-amber-300 text-amber-700',  dim:'bg-slate-50 border-slate-200 text-slate-300',icon:'⚠️'},
        baixo: {id:'cc-baixo', active:'bg-emerald-50 border-emerald-300 text-emerald-700',dim:'bg-slate-50 border-slate-200 text-slate-300',icon:'✅'},
        nd:    {id:'cc-nd',    active:'bg-slate-100 border-slate-300 text-slate-500', dim:'bg-slate-50 border-slate-200 text-slate-300',icon:'❓'},
    };
    const churnTxtLow2=(data.risco_churn||'').toLowerCase();
    const churnKey2=/baixo|m[ií]nimo|saud[aá]vel|nenhum/.test(churnTxtLow2)?'baixo':
                    /alto|cr[ií]tico|iminente|elevado/.test(churnTxtLow2)?'alto':
                    /m[eé]dio|moderado|aten[çc]|risco/.test(churnTxtLow2)?'medio':'nd';
    Object.entries(churnBoxes).forEach(([key,b])=>{
        const el=document.getElementById(b.id);
        const iconEl=document.getElementById(b.id+'-icon');
        const isActive=key===churnKey2;
        el.className=`rounded-2xl p-3 text-center border transition-all duration-300 ${isActive?b.active:b.dim}`;
        if(iconEl) iconEl.textContent=isActive?b.icon:'—';
    });

    // ── Sistemas do cliente ───────────────────────────────────────────────
    const sistemas=data.sistemas_citados||[];
    const sistemasSection=document.getElementById('sistemas-section');
    if(sistemas.length){
        sistemasSection.classList.remove('hidden');
        document.getElementById('sistemas-grid').innerHTML=sistemas.map(s=>
            `<div class="flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-bold" style="background:#f0f9ff;border-color:#bae6fd;color:#0369a1">
                <i data-lucide="monitor" class="w-4 h-4 flex-shrink-0" style="color:#41b6e6"></i>
                <span>${s}</span>
            </div>`
        ).join('');
    } else {
        sistemasSection.classList.add('hidden');
    }

    const status=document.getElementById('status-tag');
    if(media>=4.5){status.textContent='🏆 Elite CS';status.className='px-5 py-2 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-white shadow-lg';}
    else if(media>=3.5){status.textContent='🚀 Alta Performance';status.className='';status.style.cssText='background:#ede9ff;color:#5229c5;padding:0.5rem 1.25rem;border-radius:9999px;font-size:10px;font-weight:900;text-transform:uppercase;';}
    else{status.textContent='📈 Acompanhamento';status.className='px-5 py-2 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700';}

    const grid=document.getElementById('notas-grid');
    grid.innerHTML=fields.map(f=>{
        const raw=data[`nota_${f.k}`],hasScore=raw!==null&&raw!==undefined,n=hasScore?raw:null;
        const p=data[`porque_${f.k}`]||(hasScore?'Sem justificativa.':'Sem evidência na transcrição.');
        const m=data[`melhoria_${f.k}`]||'Critério de excelência atingido.';
        const c=!hasScore?'text-slate-300':n>=4?'text-emerald-500':n>=3?'text-[#0072ce]':'text-red-500';
        pillarStore[f.k]={label:f.l,score:n,hasScore,colorClass:c,porque:p,melhoria:m};
        return `<div data-pillar="${f.k}" class="pillar-card glass-card p-3 flex flex-col items-center text-center justify-center ${hasScore?'cursor-pointer hover:-translate-y-1':'opacity-50 cursor-default'} transition-all group relative" style="${hasScore?'':''}">
            ${hasScore?'<i data-lucide="zoom-in" class="absolute top-2 right-2 w-3 h-3 text-slate-300 transition-colors" style=""></i>':'<i data-lucide="minus" class="absolute top-2 right-2 w-3 h-3 text-slate-300"></i>'}
            <span class="text-[7.5px] font-black text-slate-400 uppercase mb-1 tracking-widest leading-tight mt-1">${f.l}</span>
            <div class="text-xl font-black ${c} mb-1 leading-none">${hasScore?n:'—'}</div>
            <p class="text-[7.5px] text-slate-500 italic leading-tight font-medium max-w-[95%] truncate">${p}</p>
        </div>`;
    }).join('');

    // delegação de evento: remove listener antigo antes de adicionar novo
    const newGrid=grid.cloneNode(true);
    grid.parentNode.replaceChild(newGrid,grid);
    newGrid.addEventListener('click',e=>{
        const card=e.target.closest('.pillar-card');
        if(card&&pillarStore[card.dataset.pillar]?.hasScore) openModal(pillarStore[card.dataset.pillar]);
    });

    const tCS=parseFloat(data.tempo_fala_cs||0),tCli=parseFloat(data.tempo_fala_cliente||0);
    document.getElementById('talk-time-container').innerHTML=`
        <div><div class="flex justify-between text-[11px] font-bold mb-2"><span>Analista CS 🎯</span><span style="color:#6431e2">${data.tempo_fala_cs||'0%'}</span></div><div class="h-3 w-full bg-slate-100 rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:${tCS}%;background:linear-gradient(90deg,#6431e2,#0072ce)"></div></div></div>
        <div><div class="flex justify-between text-[11px] font-bold mb-2"><span>Cliente 🤝</span><span class="text-emerald-500">${data.tempo_fala_cliente||'0%'}</span></div><div class="h-3 w-full bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-emerald-500 rounded-full" style="width:${tCli}%"></div></div></div>`;

    const ck=data.checklist_cs||{};
    const ckLabels={definiu_prazo_implementacao:'Prazo de Implantação',alinhou_dever_de_casa:'Dever de Casa Alinhado',validou_certificado_digital:'Certificado A1 / Acesso',agendou_proximo_passo:'Próxima Reunião Agendada',conectou_com_dor_vendas:'Retomou Dor de Vendas',explicou_canal_suporte:'Explicou Canal de Suporte'};
    document.getElementById('checklist-container').innerHTML=Object.entries(ckLabels).map(([key,label])=>
        `<div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"><span class="text-[9px] font-bold text-slate-600 uppercase tracking-tight">${label}</span><div class="w-5 h-5 rounded-full flex items-center justify-center ${ck[key]?'bg-emerald-500':'bg-slate-300'}"><i data-lucide="${ck[key]?'check':'minus'}" class="text-white w-3 h-3"></i></div></div>`
    ).join('');

    document.getElementById('lista-fortes').innerHTML=(data.pontos_fortes||[]).map(i=>`<li class="flex items-start gap-2"><span>▶</span> ${i}</li>`).join('');
    document.getElementById('lista-atencao').innerHTML=(data.pontos_atencao||[]).map(i=>`<li class="flex items-start gap-2"><span>▶</span> ${i}</li>`).join('');
    document.getElementById('markdown-body').innerHTML=marked.parse(data.justificativa_detalhada||'');

    // ── Bugs / Erros do Sistema ───────────────────────────────────────────
    const bugs=data.bugs||[];
    const bugsSection=document.getElementById('bugs-section');
    if(data.tem_bugs && bugs.length){
        bugsSection.classList.remove('hidden');
        const impColor={alto:'border-red-200 bg-red-50',medio:'border-orange-200 bg-orange-50',baixo:'border-yellow-100 bg-yellow-50'};
        const statusIcon={resolvido:'check-circle',escalado_suporte:'life-buoy',em_aberto:'circle-dot',aguardando_cliente:'clock'};
        const statusLabel={resolvido:'Resolvido',escalado_suporte:'Suporte Acionado',em_aberto:'Em Aberto',aguardando_cliente:'Aguardando Cliente'};
        document.getElementById('bugs-grid').innerHTML=bugs.map(b=>{
            const imp=b.impacto||'baixo';
            const st=b.status||'em_aberto';
            const cardCls=impColor[imp]||impColor.baixo;
            const icon=statusIcon[st]||'help-circle';
            const stLbl=statusLabel[st]||st;
            return `<div class="p-5 rounded-2xl border ${cardCls}">
                <div class="flex items-start justify-between gap-3 mb-3">
                    <span class="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${imp==='alto'?'bg-red-200 text-red-800':imp==='medio'?'bg-orange-200 text-orange-800':'bg-yellow-100 text-yellow-800'}">Impacto ${imp==='alto'?'Alto':imp==='medio'?'Médio':'Baixo'}</span>
                    <span class="flex items-center gap-1.5 text-[9px] font-bold text-slate-500"><i data-lucide="${icon}" class="w-3 h-3"></i>${stLbl}</span>
                </div>
                <p class="text-[12px] font-black text-slate-800 mb-1">${b.descricao||'—'}</p>
                ${b.contexto?`<p class="text-[11px] text-slate-600 mb-1"><span class="font-bold">Contexto:</span> ${b.contexto}</p>`:''}
                ${b.frase_cliente?`<p class="text-[10px] italic text-slate-500 border-t border-slate-200 mt-2 pt-2">"${b.frase_cliente}"</p>`:''}
            </div>`;
        }).join('');
    } else {
        bugsSection.classList.add('hidden');
    }

    // ── Desalinhamentos de Venda ──────────────────────────────────────────
    const desalins=data.desalinhamentos||[];
    const desalinSection=document.getElementById('desalinhamentos-section');
    if(data.tem_desalinhamento && desalins.length){
        desalinSection.classList.remove('hidden');
        const sevColor={alta:'border-red-300 bg-red-50',media:'border-amber-300 bg-amber-50',baixa:'border-yellow-200 bg-yellow-50'};
        const sevLabel={alta:'Alta',media:'Média',baixa:'Baixa'};
        const tratadoIcon={explicou:'check-circle',escalou:'arrow-up-right',registrou:'clipboard-list',ignorou:'x-circle',nao_identificado:'help-circle'};
        const tratadoLabel={explicou:'Explicou',escalou:'Escalou',registrou:'Registrou',ignorou:'Ignorou',nao_identificado:'Não identificado'};
        document.getElementById('desalinhamentos-grid').innerHTML=desalins.map(d=>{
            const sev=d.severidade||'baixa';
            const trat=d.como_tratado||'nao_identificado';
            const cardCls=sevColor[sev]||sevColor.baixa;
            const icon=tratadoIcon[trat]||'help-circle';
            const tratLbl=tratadoLabel[trat]||trat;
            return `<div class="p-5 rounded-2xl border ${cardCls}">
                <div class="flex items-start justify-between gap-3 mb-3">
                    <span class="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${sev==='alta'?'bg-red-200 text-red-800':sev==='media'?'bg-amber-200 text-amber-800':'bg-yellow-100 text-yellow-800'}">Severidade ${sevLabel[sev]||sev}</span>
                    <span class="flex items-center gap-1.5 text-[9px] font-bold text-slate-500"><i data-lucide="${icon}" class="w-3 h-3"></i>${tratLbl}</span>
                </div>
                <p class="text-[11px] font-black text-slate-700 mb-1">Expectativa: <span class="font-bold text-slate-600">${d.expectativa||'—'}</span></p>
                ${d.realidade?`<p class="text-[11px] font-black text-slate-700 mb-1">Realidade: <span class="font-bold text-slate-600">${d.realidade}</span></p>`:''}
                <p class="text-[10px] italic text-slate-500 border-t border-slate-200 mt-2 pt-2">"${d.frase_cliente||'—'}"</p>
            </div>`;
        }).join('');
    } else {
        desalinSection.classList.add('hidden');
    }

    // ── Produto e Sugestões de Melhoria ──────────────────────────────────
    const prodBadge = document.getElementById('produto-badge');
    const prodLabel = document.getElementById('produto-badge-label');
    if (data.produto_reuniao && data.produto_reuniao !== 'Não identificado') {
        const PROD_COLORS = {
            'Nibo':'#6431e2','Radar':'#0072ce','Conciliador':'#059669','BPO':'#d97706'
        };
        const prodKey = Object.keys(PROD_COLORS).find(k => data.produto_reuniao.includes(k));
        const prodColor = PROD_COLORS[prodKey] || '#6431e2';
        prodBadge.style.cssText=`background:${prodColor}18;color:${prodColor};padding:0.5rem 1rem;border-radius:9999px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;display:flex;align-items:center;gap:0.5rem;`;
        prodLabel.textContent = data.produto_reuniao;
    } else {
        prodBadge.classList.add('hidden');
    }

    const melhorias = data.melhorias || [];
    const melhoriasSection = document.getElementById('melhorias-section');
    if (data.tem_melhorias && melhorias.length) {
        melhoriasSection.classList.remove('hidden');
        const TIPO_META = {
            funcionalidade: { label:'Funcionalidade', bg:'#ede9fe', color:'#6d28d9' },
            usabilidade:    { label:'Usabilidade',    bg:'#fff7ed', color:'#c2410c' },
            integracao:     { label:'Integração',     bg:'#ecfdf5', color:'#065f46' },
            processo:       { label:'Processo',       bg:'#fef3c7', color:'#92400e' },
            relatorio:      { label:'Relatório',      bg:'#eff6ff', color:'#1e40af' },
            outro:          { label:'Outro',          bg:'#f1f5f9', color:'#475569' },
        };
        const PROD_COLORS2 = {
            'Nibo':'#6431e2','Radar':'#0072ce','Conciliador':'#059669','BPO':'#d97706','Outro':'#64748b'
        };
        document.getElementById('melhorias-grid').innerHTML = melhorias.map(m => {
            const tipo = TIPO_META[m.tipo] || TIPO_META.outro;
            const prodKey2 = Object.keys(PROD_COLORS2).find(k => (m.produto||'').includes(k));
            const prodColor2 = PROD_COLORS2[prodKey2] || '#64748b';
            return `<div class="p-5 rounded-2xl border" style="background:#fafafa;border-color:#e2e8f0">
                <div class="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <p class="font-black text-slate-800 text-[12px] flex-1 min-w-0">${m.descricao||'—'}</p>
                    <div class="flex gap-2 flex-shrink-0">
                        <span class="text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full" style="background:${prodColor2}18;color:${prodColor2}">${m.produto||'—'}</span>
                        <span class="text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full" style="background:${tipo.bg};color:${tipo.color}">${tipo.label}</span>
                    </div>
                </div>
                ${m.contexto?`<p class="text-[11px] text-slate-500 mb-2"><span class="font-bold text-slate-400 uppercase tracking-wide text-[9px]">Contexto: </span>${m.contexto}</p>`:''}
                ${m.frase_cliente?`<div class="rounded-xl p-3 border border-purple-100 bg-purple-50/40 mt-2"><p class="text-[11px] text-slate-600 italic">"${m.frase_cliente}"</p></div>`:''}
            </div>`;
        }).join('');
    } else {
        melhoriasSection.classList.add('hidden');
    }

    renderRadar(data);
    lucide.createIcons();
    // Rola para os resultados
    document.getElementById('results-section').scrollIntoView({behavior:'smooth',block:'start'});
}

function renderRadar(data){
    const ctx=document.getElementById('radarChart').getContext('2d');
    if(radarChartInstance) radarChartInstance.destroy();
    radarChartInstance=new Chart(ctx,{
        type:'radar',
        data:{labels:fields.map(f=>f.l),datasets:[{label:'Nota de CS',data:fields.map(f=>data[`nota_${f.k}`]??0),backgroundColor:'rgba(100,49,226,0.13)',borderColor:'#6431e2',borderWidth:1.5,pointRadius:2,pointBackgroundColor:'#002d72'}]},
        options:{scales:{r:{min:0,max:5,ticks:{stepSize:1,display:false},grid:{color:'#e2e8f0'},angleLines:{color:'#e2e8f0'},pointLabels:{font:{size:8,weight:'700'},color:'#475569'}}},plugins:{legend:{display:false}},maintainAspectRatio:false}
    });
}

// ── Modal pilar ─────────────────────────────────────────────────────────
function openModal({label,score,colorClass,porque,melhoria}){
    document.getElementById('modal-title').textContent=label;
    const scoreEl=document.getElementById('modal-score');
    scoreEl.textContent=score;scoreEl.className=`text-5xl font-black leading-none ${colorClass}`;
    document.getElementById('modal-text').textContent=porque;
    const container=document.getElementById('modal-improvement-container');
    const labelEl=document.getElementById('modal-improvement-label');
    const textEl=document.getElementById('modal-improvement-text');
    const iconEl=document.getElementById('modal-improvement-icon');
    textEl.textContent=melhoria;
    if(score>=5){
        container.className='rounded-2xl p-4 border border-emerald-100 bg-emerald-50 mt-2';
        labelEl.className='text-[9px] font-bold uppercase tracking-widest block text-emerald-700';
        labelEl.textContent='Excelente!';textEl.className='text-[12px] leading-relaxed font-medium text-emerald-900';
        iconEl.setAttribute('data-lucide','check-circle');
    }else{
        container.className='rounded-2xl p-4 border border-amber-100 bg-amber-50 mt-2';
        labelEl.className='text-[9px] font-bold uppercase tracking-widest block text-amber-700';
        labelEl.textContent='O que faltou para o 5?';textEl.className='text-[12px] leading-relaxed font-medium text-amber-900';
        iconEl.setAttribute('data-lucide','target');
    }
    const modal=document.getElementById('justification-modal'),modalBox=document.getElementById('modal-content-box');
    modal.classList.replace('hidden','flex');
    setTimeout(()=>{modal.classList.remove('opacity-0');modalBox.classList.replace('scale-95','scale-100');lucide.createIcons();},10);
}

function closeModal(){
    const modal=document.getElementById('justification-modal'),modalBox=document.getElementById('modal-content-box');
    modal.classList.add('opacity-0');modalBox.classList.replace('scale-100','scale-95');
    setTimeout(()=>modal.classList.replace('flex','hidden'),300);
}

document.getElementById('justification-modal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});
analyzeBtn.addEventListener('click',handleAnalysis);
document.getElementById('export-pdf-btn').addEventListener('click', async () => {
    const btn = document.getElementById('export-pdf-btn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4"></i><span class="hidden md:inline">Gerando...</span>';
    lucide.createIcons();

    const element = document.getElementById('analysis-content');
    const nomeCliente = (document.getElementById('cliente-nome-display').textContent || 'cliente').trim();
    const analista   = (document.getElementById('analista-nome-resultado').textContent || 'analista').trim();
    const filename   = `Auditoria_CS_${nomeCliente}_${analista}.pdf`.replace(/[\s/\\:*?"<>|]+/g,'_');

    try {
        await html2pdf().set({
            margin:     [8, 8, 8, 8],
            filename,
            image:      { type: 'jpeg', quality: 0.92 },
            html2canvas:{ scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
            jsPDF:      { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:  { mode: ['avoid-all', 'css', 'legacy'] },
        }).from(element).save();
        showToast('✅ PDF gerado com sucesso!', 'bg-emerald-600');
    } catch(e) {
        showToast('⚠️ Erro ao gerar PDF: ' + e.message, 'bg-red-600');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="file-pdf" class="w-4 h-4"></i><span class="hidden md:inline">PDF</span>';
        lucide.createIcons();
    }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
</script>
</body>
</html>
