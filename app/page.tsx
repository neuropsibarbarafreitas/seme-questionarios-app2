'use client';

import React from 'react';

const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString();
const LS_KEY = "neuro-mvp-forms";

function saveToLS(data: any) { if (typeof window !== 'undefined') localStorage.setItem(LS_KEY, JSON.stringify(data)); }
function loadFromLS() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null") || {}; } catch { return {}; }
}

const MCHAT_TEMPLATE = {
  id: "mchat",
  nome: "M-CHAT (16 a 30 meses)",
  descricao: "Checklist de rastreio precoce para TEA, respondido por responsáveis ou profissionais.",
  tags: ["autismo"],
  itens: [
    { id: "q1",  texto: "A criança gosta de se balançar, de pular no seu joelho, etc.?", tipo: "simnao" },
    { id: "q2",  texto: "Tem interesse por outras crianças?", tipo: "simnao" },
    { id: "q3",  texto: "Gosta de subir em coisas, como escadas ou móveis?", tipo: "simnao" },
    { id: "q4",  texto: "Gosta de brincar de esconder e mostrar o rosto ou esconde-esconde?", tipo: "simnao" },
    { id: "q5",  texto: "Já brincou de faz-de-conta (telefone, boneca, etc.)?", tipo: "simnao" },
    { id: "q6",  texto: "Já usou o dedo indicador para apontar para pedir alguma coisa?", tipo: "simnao" },
    { id: "q7",  texto: "Já usou o dedo indicador para apontar para indicar interesse em algo?", tipo: "simnao" },
    { id: "q8",  texto: "Consegue brincar de forma correta com brinquedos pequenos sem apenas colocar na boca ou remexer?", tipo: "simnao" },
    { id: "q9",  texto: "Alguma vez trouxe objetos para você para mostrá-los?", tipo: "simnao" },
    { id: "q10", texto: "Olha para você nos olhos por mais de um segundo ou dois?", tipo: "simnao" },
    { id: "q11", texto: "Já pareceu muito sensível ao barulho (ex.: tapando os ouvidos)?", tipo: "simnao" },
    { id: "q12", texto: "Sorri como resposta às suas expressões faciais ou ao seu sorriso?", tipo: "simnao" },
    { id: "q13", texto: "Imita você (ex.: caretas, gestos)?", tipo: "simnao" },
    { id: "q14", texto: "Responde/olha quando você a chama pelo nome?", tipo: "simnao" },
    { id: "q15", texto: "Se você aponta para um brinquedo do outro lado da sala, a criança acompanha com o olhar?", tipo: "simnao" },
    { id: "q16", texto: "Já sabe andar?", tipo: "simnao" },
    { id: "q17", texto: "Olha para coisas que você está olhando?", tipo: "simnao" },
    { id: "q18", texto: "Faz movimentos estranhos perto do rosto?", tipo: "simnao" },
    { id: "q19", texto: "Tenta atrair sua atenção para a atividade dele(a)?", tipo: "simnao" },
    { id: "q20", texto: "Você já se perguntou se a criança é surda?", tipo: "simnao" },
    { id: "q21", texto: "Entende o que as pessoas dizem?", tipo: "simnao" },
    { id: "q22", texto: "Às vezes fica aérea, olhando para o nada ou caminhando sem direção definida?", tipo: "simnao" },
    { id: "q23", texto: "Olha para o seu rosto para conferir sua reação quando vê algo estranho?", tipo: "simnao" },
  ],
  escala: ["Sim", "Não"],
  riscoSim: new Set(["q11","q18","q20","q22"]),
  criticos: new Set(["q2","q7","q9","q13","q14","q15"]),
};

const DEFAULT_TEMPLATES = [MCHAT_TEMPLATE];

function riskScoreFromMchat(template: any, respostas: Record<string,string>) {
  let total = 0; let critFails = 0;
  for (const item of template.itens) {
    const v = respostas[item.id];
    if (v === "") continue;
    const escolha = v === "0" ? "Sim" : "Não";
    const riskySim = template.riscoSim || new Set();
    const isRisk = riskySim.has(item.id) ? (escolha === "Sim") : (escolha === "Não");
    if (isRisk) {
      total += 1;
      if (template.criticos && template.criticos.has(item.id)) critFails += 1;
    }
  }
  let classif = "Negativo";
  let recomend = "Sem indicativo de risco pelo M-CHAT";
  if (total > 3 || critFails >= 2) {
    classif = "Positivo para risco";
    recomend = "Encaminhar para avaliação diagnóstica / intervenção precoce";
  }
  let faixa = "Baixo (0–2)";
  if (total >= 8) faixa = "Alto (8–20)"; else if (total >= 3) faixa = "Moderado (3–7)";
  return { total, critFails, classif, recomend, faixa };
}

export default function Page() {
  const [store, setStore] = React.useState<any>(loadFromLS());
  const [copied, setCopied] = React.useState("");
  const [role, setRole] = React.useState("admin");
  const [inviteCode, setInviteCode] = React.useState("");

  const [templates] = React.useState(DEFAULT_TEMPLATES);

  const [admin, setAdmin] = React.useState({
    responsavel: "",
    crianca: "",
    genitalia: "nao_informado",
    templateId: "mchat",
    destinatarioTipo: "responsavel",
    profissionalSubtipo: "",
  });

  React.useEffect(() => { saveToLS(store); }, [store]);

  const assignments = (store as any).assignments || {};
  const templatesById = React.useMemo(() => Object.fromEntries(templates.map((t:any) => [t.id, t])), [templates]);

  const domains = [
    { id: "todos", nome: "Todos" },
    { id: "autismo", nome: "Autismo" },
    { id: "tdah", nome: "TDAH" },
    { id: "dislexia", nome: "Dislexia" },
  ];
  const [domainFilter, setDomainFilter] = React.useState("autismo");

  function uidLocal() { return uid(); }
  function today() { return todayISO(); }

  function createAssignment() {
    if (!admin.responsavel || !admin.crianca) return;
    const code = uidLocal();
    const a = {
      id: code,
      responsavel: admin.responsavel,
      crianca: admin.crianca,
      genitalia: admin.genitalia,
      templateId: admin.templateId,
      destinatarioTipo: admin.destinatarioTipo,
      profissionalSubtipo: admin.profissionalSubtipo || null,
      status: "pendente",
      responses: {},
      createdAt: today(),
    };
    const next = { ...store, assignments: { ...assignments, [code]: a } };
    setStore(next);
    setInviteCode(code);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text);
      setTimeout(() => setCopied(""), 1200);
    });
  }

  function submitResponse(code: string, data: Record<string,string>) {
    const a = assignments[code];
    if (!a) return;
    const next = { ...store, assignments: { ...assignments, [code]: { ...a, responses: data, status: "concluido", submittedAt: today() } } };
    setStore(next);
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-full ring-1 ring-rose-300 bg-white">
              <img src="/logo.png" alt="Logo Bárbara de Freitas" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Neuropsicóloga – Bárbara de Freitas</h1>
              <p className="text-slate-600 text-sm">Administração de convites e coleta de respostas de questionários clínicos</p>
            </div>
          </div>

          <select className="select" value={role} onChange={e=>setRole(e.target.value)}>
            <option value="admin">Perfil: Administradora</option>
            <option value="guest">Perfil: Responder</option>
          </select>
        </header>

        {role === "admin" && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header"><div className="card-title">Gerar convite</div></div>
              <div className="card-content space-y-4">
                <div className="grid-2">
                  <div>
                    <div className="label">Nome do destinatário</div>
                    <input className="input" value={admin.responsavel} onChange={e=>setAdmin(s=>({...s, responsavel:e.target.value}))} placeholder="Ex.: Maria Silva ou Prof. Carlos" />
                  </div>
                  <div>
                    <div className="label">Nome do avaliado(a)</div>
                    <input className="input" value={admin.crianca} onChange={e=>setAdmin(s=>({...s, crianca:e.target.value}))} placeholder="Ex.: João (2a)" />
                  </div>

                  <div>
                    <div className="label">Tipo de destinatário</div>
                    <select className="select" value={admin.destinatarioTipo} onChange={e=>setAdmin(s=>({...s, destinatarioTipo:e.target.value, profissionalSubtipo: e.target.value!=='profissional' ? '' : s.profissionalSubtipo }))}>
                      <option value="responsavel">Responsável</option>
                      <option value="professor">Professor</option>
                      <option value="profissional">Outros Profissionais</option>
                    </select>
                    {admin.destinatarioTipo === "profissional" && (
                      <div className="mt-2">
                        <div className="label">Profissional (subtipo)</div>
                        <select className="select" value={admin.profissionalSubtipo} onChange={e=>setAdmin(s=>({...s, profissionalSubtipo:e.target.value}))}>
                          <option value="">Selecionar</option>
                          <option value="pediatra">Pediatra</option>
                          <option value="psicologo">Psicólogo(a)</option>
                          <option value="psicopedagogo">Psicopedagogo(a)</option>
                          <option value="psiquiatra">Psiquiatra</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="label">Domínio (facilita busca)</div>
                    <select className="select" value={domainFilter} onChange={e=>setDomainFilter(e.target.value)}>
                      {domains.map(d => (<option key={d.id} value={d.id}>{d.nome}</option>))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <div className="label">Questionário</div>
                    <select className="select" value={admin.templateId} onChange={e=>setAdmin(s=>({...s, templateId:e.target.value}))}>
                      {[MCHAT_TEMPLATE].filter(t => domainFilter==="todos" || (t.tags||[]).includes(domainFilter))
                        .map(t => (<option key={t.id} value={t.id}>{t.nome}</option>))}
                    </select>
                    <p className="text-xs text-slate-500 mt-2">Descrição: {MCHAT_TEMPLATE.descricao}</p>
                  </div>

                  <div>
                    <div className="label">Tipo de genitália (opcional)</div>
                    <select className="select" value={admin.genitalia} onChange={e=>setAdmin(s=>({...s, genitalia:e.target.value}))}>
                      <option value="penis">Pênis</option>
                      <option value="vulva">Vulva</option>
                      <option value="intersexo">Intersexo</option>
                      <option value="nao_informado">Prefiro não informar</option>
                    </select>
                  </div>
                </div>

                <button className="btn" onClick={createAssignment}>Gerar convite</button>

                {inviteCode && (
                  <div className="card mt-3">
                    <div className="card-content space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Convite gerado:</span>
                        <span className="badge">{inviteCode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input className="input" readOnly value={`https://exemplo.app/responder/${inviteCode}`} />
                        <button className="btn-outline" onClick={()=>copy(`https://exemplo.app/responder/${inviteCode}`)}>{copied ? "Copiado" : "Copiar"}</button>
                      </div>
                      <p className="text-xs text-slate-600">Envie este link ao destinatário. (Na demo, cole o código na aba “Responder”.)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">Convites e status</div></div>
              <div className="card-content space-y-3">
                {Object.values(assignments).length === 0 && (<p className="text-sm text-slate-600">Nenhum convite criado ainda.</p>)}
                {Object.values(assignments).sort((a:any,b:any)=> (b.createdAt||"").localeCompare(a.createdAt||""))
                  .map((a:any)=> (
                    <div key={a.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{a.responsavel} ↦ {a.crianca} <span className="text-xs text-slate-400">({a.destinatarioTipo}{a.profissionalSubtipo ? ` • ${a.profissionalSubtipo}` : ""})</span></div>
                          <div className="text-xs text-slate-500">{MCHAT_TEMPLATE.nome}</div>
                        </div>
                        <span className="badge">{a.status}</span>
                      </div>
                      {a.status === "concluido" && (
                        <div className="mt-2">
                          <button className="btn-outline" onClick={()=>downloadJSON(a)}>Exportar respostas (JSON)</button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">Adicionar questionário rápido</div></div>
              <div className="card-content">
                <QuickTemplateForm onCreate={(t:any)=> {
                  const next = { ...store, custom: [...(store.custom||[]), t] };
                  setStore(next);
                }} domains={domains} />
              </div>
            </div>
          </div>
        )}

        {role === "guest" && (
          <div className="card">
            <div className="card-header"><div className="card-title">Responder questionário</div></div>
            <div className="card-content space-y-4">
              <div className="grid-2">
                <div>
                  <div className="label">Código do convite</div>
                  <input className="input" value={inviteCode} onChange={e=>setInviteCode(e.target.value)} placeholder="Cole aqui o código recebido" />
                </div>
              </div>
              <Responder code={inviteCode} templatesById={{[MCHAT_TEMPLATE.id]:MCHAT_TEMPLATE}} assignment={assignments[inviteCode]} onSubmit={submitResponse} />
            </div>
          </div>
        )}

        <footer className="text-center text-xs text-slate-500 py-6">
          Demo local • Armazena dados apenas no seu navegador (localStorage). Para uso real: backend seguro + autenticação + LGPD.
        </footer>
      </div>
    </div>
  );
}

function Responder({ code, assignment, templatesById, onSubmit }:{
  code: string, assignment: any, templatesById: Record<string,any>, onSubmit: (c:string, d:Record<string,string>)=>void
}) {
  if (!code) return <p className="text-sm text-slate-600">Informe o código do convite para carregar o questionário.</p>;
  if (!assignment) return <p className="text-sm text-red-600">Convite não encontrado. Verifique o código.</p>;

  const template = templatesById[assignment.templateId];
  const [form, setForm] = React.useState<Record<string,string>>(Object.fromEntries(template.itens.map((i:any) => [i.id, ""])));
  const [sent, setSent] = React.useState(false);

  function setValue(id: string, v: string) { setForm(s => ({ ...s, [id]: v })); }
  function submit() { onSubmit(assignment.id, form); setSent(true); }

  const answered = Object.keys(form).some(k => form[k] !== "");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4">
        <div className="font-medium">{assignment.responsavel} — {assignment.crianca} <span className="text-xs text-slate-400">({assignment.destinatarioTipo}{assignment.profissionalSubtipo ? ` • ${assignment.profissionalSubtipo}` : ""})</span></div>
        <div className="text-xs text-slate-500">Questionário: {template.nome}</div>
      </div>

      {template.itens.map((item:any) => (
        <div key={item.id} className="rounded-xl border bg-white p-4">
          <div className="font-medium">{item.texto}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {template.escala.map((opt:string, idx:number) => (
              <button key={idx}
                className={"btn-outline text-sm" + (form[item.id] === String(idx) ? " btn" : "")}
                onClick={()=> setValue(item.id, String(idx))}
                type="button"
              >{opt}</button>
            ))}
          </div>
        </div>
      ))}

      {answered && <MchatResultado template={template} respostas={form} />}

      <div className="flex items-center gap-3">
        <button className="btn" onClick={submit}>Enviar respostas</button>
        {sent && <span className="badge">Enviado</span>}
      </div>
    </div>
  );
}

function MchatResultado({ template, respostas }:{ template:any, respostas:Record<string,string> }) {
  const r = riskScoreFromMchat(template, respostas);
  return (
    <div className="rounded-xl border bg-emerald-50 p-4 text-sm">
      <div className="font-semibold">Resultado automático — M-CHAT</div>
      <div className="mt-1">Pontuação total de risco: <span className="font-medium">{r.total}</span> • Itens críticos falhos: <span className="font-medium">{r.critFails}</span></div>
      <div>Classificação: <span className="font-medium">{r.classif}</span> • Faixa sugerida: <span className="font-medium">{r.faixa}</span></div>
      <div className="text-slate-600">Regra: risco positivo se <em>&gt; 3</em> pontos totais OU <em>&ge; 2</em> itens críticos (2, 7, 9, 13, 14, 15). Este resultado é triagem e não constitui diagnóstico.</div>
    </div>
  );
}

function downloadJSON(assignment:any) {
  const blob = new Blob([JSON.stringify(assignment, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `respostas_${assignment.crianca}_${assignment.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function QuickTemplateForm({ onCreate, domains }:{ onCreate:(t:any)=>void, domains:{id:string, nome:string}[] }) {
  const [nome, setNome] = React.useState("");
  const [dom, setDom] = React.useState("todos");
  const [itensTxt, setItensTxt] = React.useState("");

  function create() {
    if (!nome || !itensTxt.trim()) return;
    const lines = itensTxt.split(/\n+/).map(s=>s.trim()).filter(Boolean);
    const id = uid();
    const t = { id, nome, descricao: "Custom", tags: dom === "todos" ? [] : [dom], itens: lines.map((texto, i)=> ({ id: `i${i+1}`, texto, tipo: "simnao" })), escala: ["Sim","Não"] };
    onCreate(t);
    setNome(""); setItensTxt("");
  }

  return (
    <div className="space-y-3">
      <div className="grid-2">
        <div>
          <div className="label">Nome do questionário</div>
          <input className="input" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex.: Checklist Dislexia (rápido)" />
        </div>
        <div>
          <div className="label">Domínio</div>
          <select className="select" value={dom} onChange={e=>setDom(e.target.value)}>
            {domains.map(d => (<option key={d.id} value={d.id}>{d.nome}</option>))}
          </select>
        </div>
      </div>
      <div>
        <div className="label">Itens (um por linha)</div>
        <textarea className="input" rows={6} value={itensTxt} onChange={e=>setItensTxt(e.target.value)} placeholder={"Escreva cada pergunta em uma nova linha"} />
      </div>
      <button className="btn" onClick={create}>Adicionar</button>
    </div>
  );
}
