/**
 * 国际贸易术语库（静态站点）
 * - 数据来源：./data/terms.json
 * - 功能：双语对照展示、检索、分类筛选、流程图式浏览、详情弹窗
 * - 扩展：拉美西班牙语国家（智利、墨西哥、阿根廷、哥伦比亚、秘鲁）
 */

const $ = (sel) => document.querySelector(sel);
const CUSTOM_TERMS_KEY = "trade_terms_custom_terms_v1";

const state = {
  terms: [],
  customTerms: [],
  filtered: [],
  q: "",
  category: "",
  flowId: "all",
  viewMode: "bilingual", // bilingual | zh | es
  activeTermId: null, // 当前选中的术语ID（用于流程图式浏览）
};

// 分类显示顺序
const CATEGORY_ORDER = [
  "业务流程",
  "企业组织",
  "摩配汽配",
];

// ============ 流程阶段定义（含上下游关联）============
const FLOW_STAGES = [
  {
    id: "all",
    title: "全部流程",
    desc: "查看全库术语",
    icon: "◆",
    color: "#94a3b8",
  },
  {
    id: "quote",
    title: "询盘报价",
    desc: "询盘、报价、贸易术语、付款框架",
    icon: "①",
    color: "#7dd3fc",
    prev: ["all"],
    next: ["sample_order"],
    prefixes: ["incoterms_"],
    ids: [
      "contract_rfq", "contract_quotation", "contract_moq", "doc_pi",
      "pay_tt", "pay_lc", "pay_dp", "pay_da", "pay_open_account",
      "pay_swift_iban", "pay_bank_charges",
    ],
    keywords: ["询价", "报价", "cotizacion", "proforma", "价格", "incoterms"],
    coreTerms: ["incoterms_fob", "incoterms_cif", "incoterms_exw", "pay_lc", "pay_tt"],
  },
  {
    id: "sample_order",
    title: "打样下单",
    desc: "样品、确认、PO、OEM/ODM、交期",
    icon: "②",
    color: "#7dd3fc",
    prev: ["quote"],
    next: ["production_qc"],
    ids: [
      "contract_sample", "contract_golden_sample", "contract_po",
      "contract_oem", "contract_odm", "contract_lead_time", "contract_moq",
    ],
    keywords: ["样品", "sample", "po", "purchase order", "打样", "签样", "lead time"],
    coreTerms: ["contract_po", "contract_sample", "contract_moq", "contract_lead_time"],
  },
  {
    id: "production_qc",
    title: "生产验货",
    desc: "量产、检验、批次、测试与质量控制",
    icon: "③",
    color: "#a78bfa",
    prev: ["sample_order"],
    next: ["shipping"],
    ids: [
      "contract_aql", "doc_certificate_of_inspection", "doc_msds",
      "contract_warranty", "log_lot_number", "log_serial_number",
      "customs_test_report", "customs_technical_file",
    ],
    keywords: ["验货", "inspection", "aql", "批次", "serial", "测试", "质保", "质量"],
    coreTerms: ["contract_aql", "doc_certificate_of_inspection", "customs_test_report"],
  },
  {
    id: "shipping",
    title: "订舱出运",
    desc: "订舱、补料、提单、时效、附加费",
    icon: "④",
    color: "#a78bfa",
    prev: ["production_qc"],
    next: ["spain_customs", "latam_customs"],
    ids: [
      "doc_bl", "doc_original_bl", "doc_sea_waybill", "doc_awb", "doc_telex_release",
      "doc_shippers_letter", "log_booking", "log_booking_confirmation", "log_cut_off",
      "log_eta_eta", "log_pol_pod", "log_fcl", "log_lcl", "log_trucking",
      "log_transshipment", "log_vgm", "log_baf", "log_thc", "risk_general_average",
    ],
    keywords: ["订舱", "booking", "提单", "awb", "vessel", "cut-off", "shipment", "海运", "空运"],
    coreTerms: ["doc_bl", "log_booking", "log_fcl", "log_pol_pod"],
  },
  {
    id: "spain_customs",
    title: "西班牙清关",
    desc: "进口申报、税务、责任主体、技术文件",
    icon: "⑤",
    color: "#fbbf24",
    prev: ["shipping"],
    next: ["warehouse_delivery"],
    prefixes: ["customs_"],
    ids: [
      "doc_ci", "doc_pl", "doc_coo", "doc_arrival_notice", "doc_delivery_order",
      "doc_insurance_certificate", "doc_certificate_of_inspection", "doc_msds",
    ],
    keywords: ["西班牙", "spain", "espana", "aduanas", "清关", "importacion", "税", "eori", "mrn"],
    coreTerms: ["customs_eori", "customs_sad_dua", "customs_vat_iva", "customs_mrn"],
  },
  {
    id: "latam_customs",
    title: "拉美清关",
    desc: "智利、墨西哥、阿根廷、哥伦比亚、秘鲁、巴西等清关",
    icon: "LA",
    color: "#fbbf24",
    prev: ["shipping"],
    next: ["warehouse_delivery"],
    prefixes: ["chile_", "mexico_", "argentina_", "colombia_", "peru_", "brazil_", "venezuela_", "ecuador_", "uruguay_", "bolivia_", "panama_"],
    keywords: ["智利", "chile", "墨西哥", "mexico", "阿根廷", "argentina", "哥伦比亚", "colombia", "秘鲁", "peru", "巴西", "brasil", "委内瑞拉", "venezuela", "厄瓜多尔", "ecuador", "乌拉圭", "uruguay", "玻利维亚", "bolivia", "巴拿马", "panama", "panamá", "sii", "sat", "afip", "dian", "sunat", "receita", "seniat", "senae", "dna", "anb", "ana"],
    coreTerms: ["chile_sii", "mexico_sat", "argentina_afip", "colombia_dian", "peru_sunat", "brazil_receita_federal", "venezuela_seniat", "ecuador_senae", "uruguay_dna", "bolivia_aduana_nacional", "panama_ana"],
  },
  {
    id: "warehouse_delivery",
    title: "仓配派送",
    desc: "海外仓、入出库、拣货、尾程、退件",
    icon: "⑥",
    color: "#34d399",
    prev: ["spain_customs", "latam_customs"],
    next: ["aftersales_payment"],
    ids: [
      "ecom_amazon_fba", "ecom_amazon_fbm", "ecom_3pl", "ecom_rma",
      "ecom_prep_service", "ecom_carton_label", "log_overseas_warehouse",
      "log_bonded_warehouse", "log_fulfillment", "log_inbound", "log_outbound",
      "log_putaway", "log_picking", "log_packing", "log_replenishment",
      "log_cross_docking", "log_wave_picking", "log_cycle_count", "log_stock_take",
      "log_safety_stock", "log_reorder_point", "log_inventory_turnover",
      "log_fifo", "log_fefo", "log_palletization", "log_storage_fee",
      "log_handling_fee", "log_dock_appointment", "log_last_mile",
      "log_delivery_exception", "log_failed_delivery", "log_proof_of_delivery",
      "log_reverse_logistics", "log_linehaul", "log_hub",
    ],
    keywords: ["仓", "warehouse", "delivery", "派送", "拣货", "putaway", "last-mile", "reverse logistics"],
    coreTerms: ["ecom_amazon_fba", "log_overseas_warehouse", "log_fulfillment", "log_last_mile"],
  },
  {
    id: "aftersales_payment",
    title: "售后回款",
    desc: "退货、索赔、账期、催收、信用风控",
    icon: "⑦",
    color: "#f87171",
    prev: ["warehouse_delivery"],
    next: [],
    prefixes: ["pay_", "risk_"],
    ids: [
      "contract_claim", "contract_warranty", "ecom_return_rate",
      "ecom_rma", "ecom_customer_review", "log_reverse_logistics", "log_proof_of_delivery",
    ],
    keywords: ["回款", "付款", "overdue", "chargeback", "claim", "索赔", "催款", "退货", "refund"],
    coreTerms: ["contract_claim", "pay_overdue", "pay_dunning", "pay_chargeback"],
  },
];

function getFlowStage(flowId) {
  return FLOW_STAGES.find((x) => x.id === flowId) || FLOW_STAGES[0];
}

// ============ 术语关联图谱（上下游关系）============
const TERM_RELATIONS = {
  // Incoterms 关联
  "incoterms_fob": { prev: ["incoterms_exw", "incoterms_fca"], next: ["doc_bl", "log_booking", "log_fcl"], related: ["incoterms_cfr", "incoterms_cif"] },
  "incoterms_cif": { prev: ["incoterms_fob", "incoterms_cfr"], next: ["doc_insurance_certificate", "doc_bl"], related: ["incoterms_cip"] },
  "incoterms_exw": { prev: [], next: ["incoterms_fca", "log_trucking"], related: ["incoterms_fob"] },
  "incoterms_ddp": { prev: ["incoterms_dap", "incoterms_dpu"], next: ["customs_clearance", "customs_vat_iva"], related: ["incoterms_dap"] },

  // 单证关联
  "doc_bl": { prev: ["log_booking", "log_booking_confirmation"], next: ["doc_telex_release", "doc_original_bl"], related: ["doc_sea_waybill", "doc_awb"] },
  "doc_pi": { prev: ["contract_quotation"], next: ["contract_po", "pay_tt"], related: ["doc_ci"] },
  "doc_ci": { prev: ["doc_pi", "contract_po"], next: ["customs_clearance", "customs_customs_value"], related: ["doc_pl", "doc_coo"] },
  "doc_pl": { prev: ["doc_ci"], next: ["customs_clearance"], related: ["doc_ci", "doc_coo"] },
  "doc_coo": { prev: ["doc_ci"], next: ["customs_clearance", "customs_tariff_preference"], related: ["doc_ci", "doc_pl"] },

  // 物流关联
  "log_booking": { prev: ["contract_po", "incoterms_fob"], next: ["log_booking_confirmation", "doc_bl"], related: ["log_cut_off", "log_pol_pod"] },
  "log_fcl": { prev: ["log_booking"], next: ["log_vgm", "log_cut_off"], related: ["log_lcl"] },
  "log_lcl": { prev: ["log_booking"], next: ["log_cbm"], related: ["log_fcl", "log_consolidado"] },
  "log_vgm": { prev: ["log_fcl", "log_booking"], next: ["log_cut_off"], related: ["log_fcl"] },
  "log_cut_off": { prev: ["log_booking", "log_vgm"], next: ["log_eta_eta"], related: ["log_booking_confirmation"] },
  "log_eta_eta": { prev: ["log_cut_off", "log_pol_pod"], next: ["doc_arrival_notice", "customs_clearance"], related: ["log_transit_time"] },

  // 西班牙清关关联
  "customs_eori": { prev: ["contract_po"], next: ["customs_sad_dua", "customs_clearance"], related: ["customs_importer_of_record"] },
  "customs_sad_dua": { prev: ["customs_eori", "doc_ci"], next: ["customs_mrn", "customs_levante"], related: ["customs_clearance"] },
  "customs_mrn": { prev: ["customs_sad_dua"], next: ["customs_levante"], related: ["customs_prealert"] },
  "customs_vat_iva": { prev: ["customs_customs_value", "customs_clearance"], next: ["pay_open_account"], related: ["customs_spanish_vat_number"] },
  "customs_clearance": { prev: ["doc_ci", "doc_pl", "doc_coo"], next: ["customs_vat_iva", "doc_delivery_order"], related: ["customs_broker"] },

  // 智利清关关联
  "chile_sii": { prev: [], next: ["chile_rut", "chile_diu"], related: ["chile_vat_iva"] },
  "chile_rut": { prev: ["chile_sii"], next: ["chile_diu", "chile_fta_china"], related: ["chile_sii"] },
  "chile_diu": { prev: ["chile_rut", "doc_ci"], next: ["chile_arsenal", "chile_vat_iva"], related: ["chile_vuc"] },
  "chile_fta_china": { prev: ["chile_rut"], next: ["chile_certificado_origen_fta"], related: ["chile_derechos_aduana"] },
  "chile_certificado_origen_fta": { prev: ["chile_fta_china", "doc_coo"], next: ["chile_diu"], related: ["chile_fta_china"] },

  // 墨西哥清关关联
  "mexico_sat": { prev: [], next: ["mexico_rfc", "mexico_pedimento"], related: ["mexico_vucem"] },
  "mexico_rfc": { prev: ["mexico_sat"], next: ["mexico_pedimento", "mexico_agente_aduanal"], related: ["mexico_sat"] },
  "mexico_pedimento": { prev: ["mexico_rfc", "doc_ci"], next: ["mexico_iva", "mexico_ieps"], related: ["mexico_vucem"] },
  "mexico_nom": { prev: ["customs_test_report"], next: ["mexico_pedimento"], related: ["mexico_anz"] },
  "mexico_vucem": { prev: ["mexico_sat"], next: ["mexico_pedimento"], related: ["mexico_sat"] },

  // 阿根廷清关关联
  "argentina_afip": { prev: [], next: ["argentina_cuit", "argentina_sira"], related: ["argentina_derechos_exportacion"] },
  "argentina_cuit": { prev: ["argentina_afip"], next: ["argentina_sira", "argentina_djai"], related: ["argentina_cuil"] },
  "argentina_sira": { prev: ["argentina_cuit", "doc_ci"], next: ["argentina_iva", "argentina_derechos_exportacion"], related: ["argentina_djai"] },
  "argentina_mercosur": { prev: [], next: ["argentina_certificado_origen_mercosur"], related: ["latam_mercosur"] },

  // 哥伦比亚清关关联
  "colombia_dian": { prev: [], next: ["colombia_nit", "colombia_vuce"], related: ["colombia_iva"] },
  "colombia_nit": { prev: ["colombia_dian"], next: ["colombia_vuce", "colombia_registro_importador"], related: ["colombia_dian"] },
  "colombia_invima": { prev: ["customs_health_certificate"], next: ["colombia_vuce"], related: ["colombia_icontec"] },

  // 秘鲁清关关联
  "peru_sunat": { prev: [], next: ["peru_ruc", "peru_dau_peru"], related: ["peru_igv"] },
  "peru_ruc": { prev: ["peru_sunat"], next: ["peru_dau_peru", "peru_certificado_origen"], related: ["peru_sunat"] },
  "peru_dau_peru": { prev: ["peru_ruc", "doc_ci"], next: ["peru_igv"], related: ["peru_vuce_peru"] },
  "peru_tlc_peru_china": { prev: [], next: ["peru_certificado_origen"], related: ["latam_tlc_peru_china"] },

  // 付款关联
  "pay_lc": { prev: ["contract_quotation", "doc_pi"], next: ["pay_discrepancy", "pay_bank_charges"], related: ["pay_dp", "pay_da"] },
  "pay_tt": { prev: ["doc_pi", "contract_po"], next: ["pay_swift_iban", "pay_bank_charges"], related: ["pay_open_account"] },
  "pay_open_account": { prev: ["customs_vat_iva", "doc_delivery_order"], next: ["pay_overdue", "pay_dunning"], related: ["pay_tt"] },
  "pay_overdue": { prev: ["pay_open_account"], next: ["pay_dunning", "pay_chargeback"], related: ["pay_credit_limit"] },

  // 合同关联
  "contract_po": { prev: ["contract_quotation", "doc_pi"], next: ["contract_sample", "contract_lead_time"], related: ["contract_moq"] },
  "contract_sample": { prev: ["contract_po"], next: ["contract_golden_sample", "contract_aql"], related: ["contract_oem", "contract_odm"] },
  "contract_aql": { prev: ["contract_sample"], next: ["doc_certificate_of_inspection"], related: ["contract_warranty"] },

  // 电商关联
  "ecom_amazon_fba": { prev: ["ecom_amazon_fbm"], next: ["log_inbound", "log_putaway"], related: ["ecom_3pl"] },
  "log_last_mile": { prev: ["log_outbound", "log_picking"], next: ["log_proof_of_delivery", "log_delivery_exception"], related: ["log_linehaul"] },
  "log_proof_of_delivery": { prev: ["log_last_mile"], next: ["ecom_rma", "contract_claim"], related: ["log_delivery_exception"] },
};

function getTermRelations(termId) {
  return TERM_RELATIONS[termId] || { prev: [], next: [], related: [] };
}

function findTermById(id) {
  return state.terms.find((t) => t.id === id);
}

// ============ 搜索与筛选工具函数 ============
function normalizeForSearch(s) {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchHaystack(t) {
  const parts = [
    t.abbr, t.zh?.term, t.es?.term,
    t.zh?.aliases?.join(" "), t.es?.aliases?.join(" "),
    t.category, t.tags?.join(" "),
    t.zh?.definition, t.es?.definition,
    t.zh?.commonMistake, t.es?.commonMistake,
    t.zh?.practicalTip, t.es?.practicalTip,
    t.zh?.spainExample, t.es?.spainExample,
  ].filter(Boolean);
  return normalizeForSearch(parts.join(" | "));
}

function buildFlowHaystack(t) {
  return normalizeForSearch(
    [t.id, t.abbr, t.category, t.tags?.join(" "), t.zh?.term, t.es?.term,
     t.zh?.aliases?.join(" "), t.es?.aliases?.join(" "),
     t.zh?.definition, t.es?.definition].filter(Boolean).join(" | ")
  );
}

function prepareTerm(t) {
  return {
    ...t,
    _haystack: buildSearchHaystack(t),
    _flowHaystack: buildFlowHaystack(t),
  };
}

function stripRuntimeFields(t) {
  const { _haystack, _flowHaystack, ...raw } = t;
  return raw;
}

function loadCustomTerms() {
  try {
    const raw = localStorage.getItem(CUSTOM_TERMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t) => t && t.id) : [];
  } catch (err) {
    console.warn("读取自定义术语失败", err);
    return [];
  }
}

function saveCustomTerms(terms) {
  localStorage.setItem(
    CUSTOM_TERMS_KEY,
    JSON.stringify(terms.map(stripRuntimeFields), null, 2)
  );
}

function buildCustomTermFromForm() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const id = `custom_${Date.now()}`;
  const category = $("#customCategory").value || "业务流程";
  const abbr = $("#customAbbr").value.trim();
  const zhTerm = $("#customZhTerm").value.trim();
  const esTerm = $("#customEsTerm").value.trim();
  const tags = $("#customTags").value
    .split(/[,，]/)
    .map((x) => x.trim())
    .filter(Boolean);
  const zhDefinition = $("#customZhDefinition").value.trim();
  const esDefinition = $("#customEsDefinition").value.trim();
  const zhExample = $("#customZhExample").value.trim();
  const esExample = $("#customEsExample").value.trim();

  return {
    id,
    abbr,
    category,
    tags: tags.length ? tags : ["自定义/Personalizado"],
    source: "用户自定义新增术语（保存在浏览器本地）",
    updatedAt: date,
    custom: true,
    zh: {
      term: zhTerm,
      aliases: abbr ? [abbr] : [],
      definition: zhDefinition,
      example: zhExample || `新增自定义术语：${zhTerm}。`,
      commonMistake: "自定义术语为本地保存内容，正式使用前建议结合业务场景再次确认。",
      practicalTip: "如需长期维护，可使用“导出自定义术语”功能备份并合并进正式数据文件。",
      spainExample: zhExample || `自定义场景例句：请确认“${zhTerm}”在本次业务沟通中的具体含义。`,
      note: "该术语由用户在页面中自行添加。",
    },
    es: {
      term: esTerm,
      aliases: abbr ? [abbr] : [],
      definition: esDefinition,
      example: esExample || `Nuevo término personalizado: ${esTerm}.`,
      commonMistake: "Este término personalizado se guarda localmente; conviene validarlo antes de usarlo formalmente.",
      practicalTip: "Para mantenimiento permanente, use la exportación de términos personalizados e intégrelos al archivo de datos oficial.",
      spainExample: esExample || `Ejemplo personalizado: confirme el significado concreto de “${esTerm}” en esta operación.`,
      note: "Término añadido por el usuario desde la página.",
    },
  };
}

function openCustomTermDialog() {
  const dlg = $("#customTermDialog");
  if (dlg && !dlg.open) dlg.showModal();
}

function closeCustomTermDialog() {
  const dlg = $("#customTermDialog");
  if (dlg?.open) dlg.close();
}

function resetCustomTermForm() {
  $("#customTermForm")?.reset();
}

function updateAfterCustomTermChange() {
  const categories = Array.from(
    new Set(state.terms.map((t) => t.category).filter(Boolean))
  ).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    const aKnown = ai !== -1;
    const bKnown = bi !== -1;
    if (aKnown && bKnown) return ai - bi;
    if (aKnown) return -1;
    if (bKnown) return 1;
    return a.localeCompare(b, "zh-Hans-CN");
  });
  setCategoryOptions(categories);
  applyFilters();
}

function handleCustomTermSubmit(e) {
  e.preventDefault();
  const term = buildCustomTermFromForm();
  if (!term.zh.term || !term.es.term || !term.zh.definition || !term.es.definition) {
    alert("请至少填写中文术语、西语术语、中文释义和西语释义。");
    return;
  }

  const rawTerm = stripRuntimeFields(term);
  state.customTerms.push(rawTerm);
  saveCustomTerms(state.customTerms);
  state.terms.push(prepareTerm(rawTerm));
  state.activeTermId = rawTerm.id;
  resetCustomTermForm();
  closeCustomTermDialog();
  updateAfterCustomTermChange();
  openDetail(findTermById(rawTerm.id));
}

function exportCustomTerms() {
  const customTerms = state.customTerms.map(stripRuntimeFields);
  if (!customTerms.length) {
    alert("当前还没有自定义术语可导出。");
    return;
  }

  const blob = new Blob([JSON.stringify(customTerms, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `custom_terms_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function matchesQuery(t, qNorm) {
  if (!qNorm) return true;
  return t._haystack.includes(qNorm);
}

function matchesCategory(t, category) {
  if (!category) return true;
  return t.category === category;
}

function matchesFlow(t, flowId) {
  if (!flowId || flowId === "all") return true;
  const flow = getFlowStage(flowId);
  const text = t._flowHaystack || "";
  if ((flow.ids || []).includes(t.id)) return true;
  if ((flow.prefixes || []).some((prefix) => t.id?.startsWith(prefix))) return true;
  if ((flow.categories || []).includes(t.category)) return true;
  return (flow.keywords || []).some((keyword) => text.includes(normalizeForSearch(keyword)));
}

function compareTerm(a, b) {
  const ak = (a.abbr || a.zh?.term || a.es?.term || "").toString();
  const bk = (b.abbr || b.zh?.term || b.es?.term || "").toString();
  return ak.localeCompare(bk, "zh-Hans-CN");
}

function termPrimaryLine(t) {
  const mode = state.viewMode;
  const zh = t.zh?.term || "";
  const es = t.es?.term || "";
  const abbr = t.abbr || "";
  if (mode === "zh") {
    return { primary: zh || abbr || es, secondary: abbr && zh ? `缩写：${abbr}` : es ? `西语：${es}` : "", abbr };
  }
  if (mode === "es") {
    return { primary: es || abbr || zh, secondary: abbr && es ? `Sigla: ${abbr}` : zh ? `中文：${zh}` : "", abbr };
  }
  return { primary: zh || es || abbr, secondary: zh && es ? es : "", abbr };
}

// ============ 渲染函数 ============
function renderList() {
  const list = $("#list");
  list.innerHTML = "";

  const items = state.filtered;
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "row";
    empty.style.cursor = "default";
    empty.innerHTML = `
      <div class="termLine">
        <div class="termLine__top">
          <div class="termLine__primary">没有匹配的术语</div>
        </div>
        <div class="termLine__secondary">请尝试更换关键词或清空筛选条件。</div>
      </div>
      <div></div>
      <div></div>
    `;
    list.appendChild(empty);
    return;
  }

  for (const t of items) {
    const row = document.createElement("div");
    row.className = "row";
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.dataset.termId = t.id;
    if (state.activeTermId === t.id) row.classList.add("is-active");

    const { primary, secondary, abbr } = termPrimaryLine(t);
    const abbrPill = abbr ? `<span class="termLine__abbr">${escapeHtml(abbr)}</span>` : "";
    const tags = (t.tags || []).slice(0, 4);
    const tagsHtml = tags.length
      ? tags.map((x) => `<span class="pill pill--muted">${escapeHtml(x)}</span>`).join("")
      : `<span class="pill pill--muted">—</span>`;

    row.innerHTML = `
      <div class="termLine">
        <div class="termLine__top">
          <div class="termLine__primary">${escapeHtml(primary)}</div>
          ${abbrPill}
        </div>
        <div class="termLine__secondary">${escapeHtml(secondary)}</div>
      </div>
      <div class="col col--category">
        <span class="pill">${escapeHtml(t.category || "未分类")}</span>
      </div>
      <div class="tags">${tagsHtml}</div>
    `;

    row.addEventListener("click", () => {
      state.activeTermId = t.id;
      openDetail(t);
      renderList(); // 重新渲染以高亮选中项
      renderFlowGraph(); // 更新流程图
    });
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        state.activeTermId = t.id;
        openDetail(t);
        renderList();
        renderFlowGraph();
      }
    });

    list.appendChild(row);
  }
}

function renderStatus() {
  const status = $("#status");
  const total = state.terms.length;
  const shown = state.filtered.length;
  const customCount = state.customTerms.length;
  const parts = [];
  parts.push(`共 ${total} 条术语，当前显示 ${shown} 条`);
  if (customCount) parts.push(`自定义 ${customCount} 条`);
  if (state.flowId && state.flowId !== "all") parts.push(`流程：${getFlowStage(state.flowId).title}`);
  if (state.category) parts.push(`分类：${state.category}`);
  if (state.q) parts.push(`关键词：${state.q}`);
  if (state.activeTermId) {
    const t = findTermById(state.activeTermId);
    if (t) parts.push(`当前术语：${t.zh?.term || t.es?.term || t.id}`);
  }
  status.textContent = parts.join(" · ");
}

// ============ 流程图式导航 ============
function renderFlowNav() {
  const nav = $("#flowNav");
  if (!nav) return;

  // 参考图式卡片布局：上方为主流程，下方为清关与履约流程
  const topFlow = ["all", "quote", "sample_order", "production_qc", "shipping"];
  const bottomFlow = ["spain_customs", "latam_customs", "warehouse_delivery", "aftersales_payment"];

  let html = `<div class="flowCardGrid">`;
  html += `<div class="flowCardGrid__row flowCardGrid__row--top">`;
  html += topFlow.map((fid) => renderBusinessFlowCard(fid)).join("");
  html += `</div>`;
  html += `<div class="flowCardGrid__row flowCardGrid__row--bottom">`;
  html += bottomFlow.map((fid) => renderBusinessFlowCard(fid)).join("");
  html += `</div>`;
  html += `</div>`;

  nav.innerHTML = html;

  // 绑定点击事件
  nav.querySelectorAll("[data-flow-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.flowId = btn.dataset.flowId;
      state.activeTermId = null;
      renderFlowNav();
      applyFilters();
      renderFlowGraph();
    });
  });
}

function renderBusinessFlowCard(flowId) {
  const flow = getFlowStage(flowId);
  const count = state.terms.filter((t) => matchesFlow(t, flowId)).length;
  const isActive = state.flowId === flowId;
  const isLatam = flowId.startsWith("latam_");

  return `
    <button type="button"
      class="flowCard${isActive ? " is-active" : ""}${isLatam ? " is-latam" : ""}"
      data-flow-id="${escapeHtml(flowId)}"
      title="${escapeHtml(flow.desc)}">
      <div class="flowCard__title">${escapeHtml(flow.title)}</div>
      <div class="flowCard__desc">${escapeHtml(flow.desc)} · ${count} 条</div>
    </button>
  `;
}

// ============ 流程图式关联术语展示 ============
function renderFlowGraph() {
  const container = $("#flowGraph");
  if (!container) return;

  // 如果没有选中术语，显示当前流程阶段的推荐术语
  if (!state.activeTermId) {
    renderFlowRecommendedTerms(container);
    return;
  }

  const t = findTermById(state.activeTermId);
  if (!t) {
    container.innerHTML = "";
    return;
  }

  const rels = getTermRelations(state.activeTermId);
  const prevTerms = rels.prev.map(findTermById).filter(Boolean);
  const nextTerms = rels.next.map(findTermById).filter(Boolean);
  const relatedTerms = rels.related.map(findTermById).filter(Boolean);

  let html = `<div class="flowGraph">`;

  // 上游术语
  if (prevTerms.length) {
    html += `<div class="flowGraph__section flowGraph__section--prev">`;
    html += `<div class="flowGraph__label">← 上游关联（前置步骤）</div>`;
    html += `<div class="flowGraph__terms">`;
    for (const pt of prevTerms) {
      html += renderMiniTermCard(pt);
    }
    html += `</div></div>`;
  }

  // 当前术语
  html += `<div class="flowGraph__section flowGraph__section--current">`;
  html += `<div class="flowGraph__label">● 当前术语</div>`;
  html += `<div class="flowGraph__terms">`;
  html += renderMiniTermCard(t, true);
  html += `</div></div>`;

  // 下游术语
  if (nextTerms.length) {
    html += `<div class="flowGraph__section flowGraph__section--next">`;
    html += `<div class="flowGraph__label">→ 下游关联（后续步骤）</div>`;
    html += `<div class="flowGraph__terms">`;
    for (const nt of nextTerms) {
      html += renderMiniTermCard(nt);
    }
    html += `</div></div>`;
  }

  // 相关术语
  if (relatedTerms.length) {
    html += `<div class="flowGraph__section flowGraph__section--related">`;
    html += `<div class="flowGraph__label">⇄ 相关术语（平行/替代）</div>`;
    html += `<div class="flowGraph__terms">`;
    for (const rt of relatedTerms) {
      html += renderMiniTermCard(rt);
    }
    html += `</div></div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  // 绑定迷你卡片点击事件
  container.querySelectorAll("[data-term-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const tid = card.dataset.termId;
      const term = findTermById(tid);
      if (term) {
        state.activeTermId = tid;
        openDetail(term);
        renderList();
        renderFlowGraph();
      }
    });
  });
}

function renderMiniTermCard(t, isCurrent = false) {
  const { primary, abbr } = termPrimaryLine(t);
  const abbrHtml = abbr ? `<span class="miniCard__abbr">${escapeHtml(abbr)}</span>` : "";
  return `
    <div class="miniCard${isCurrent ? " is-current" : ""}" data-term-id="${escapeHtml(t.id)}" role="button" tabindex="0">
      <div class="miniCard__top">
        <div class="miniCard__title">${escapeHtml(primary)}</div>
        ${abbrHtml}
      </div>
      <div class="miniCard__category">${escapeHtml(t.category || "")}</div>
      <div class="miniCard__tags">${(t.tags || []).slice(0, 2).map((tag) => `<span class="miniCard__tag">${escapeHtml(tag)}</span>`).join("")}</div>
    </div>
  `;
}

function renderFlowRecommendedTerms(container) {
  const flow = getFlowStage(state.flowId);
  if (state.flowId === "all" || !flow.coreTerms) {
    container.innerHTML = "";
    return;
  }

  const coreTerms = flow.coreTerms.map(findTermById).filter(Boolean);
  if (!coreTerms.length) {
    container.innerHTML = "";
    return;
  }

  // 同时显示上下游流程的推荐术语
  const prevFlows = (flow.prev || []).map(getFlowStage).filter(Boolean);
  const nextFlows = (flow.next || []).map(getFlowStage).filter(Boolean);

  let html = `<div class="flowGraph">`;

  // 上游推荐
  if (prevFlows.length) {
    html += `<div class="flowGraph__section flowGraph__section--prev">`;
    html += `<div class="flowGraph__label">← 上一步骤推荐</div>`;
    html += `<div class="flowGraph__terms">`;
    for (const pf of prevFlows) {
      const terms = (pf.coreTerms || []).map(findTermById).filter(Boolean).slice(0, 2);
      for (const pt of terms) {
        html += renderMiniTermCard(pt);
      }
    }
    html += `</div></div>`;
  }

  // 当前推荐
  html += `<div class="flowGraph__section flowGraph__section--current">`;
  html += `<div class="flowGraph__label">● ${escapeHtml(flow.title)} · 核心术语</div>`;
  html += `<div class="flowGraph__terms">`;
  for (const ct of coreTerms) {
    html += renderMiniTermCard(ct);
  }
  html += `</div></div>`;

  // 下游推荐
  if (nextFlows.length) {
    html += `<div class="flowGraph__section flowGraph__section--next">`;
    html += `<div class="flowGraph__label">→ 下一步骤推荐</div>`;
    html += `<div class="flowGraph__terms">`;
    for (const nf of nextFlows) {
      const terms = (nf.coreTerms || []).map(findTermById).filter(Boolean).slice(0, 2);
      for (const nt of terms) {
        html += renderMiniTermCard(nt);
      }
    }
    html += `</div></div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  container.querySelectorAll("[data-term-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const tid = card.dataset.termId;
      const term = findTermById(tid);
      if (term) {
        state.activeTermId = tid;
        openDetail(term);
        renderList();
        renderFlowGraph();
      }
    });
  });
}

// ============ 筛选与详情 ============
function applyFilters() {
  const qNorm = normalizeForSearch(state.q);
  state.filtered = state.terms
    .filter((t) => matchesFlow(t, state.flowId))
    .filter((t) => matchesCategory(t, state.category))
    .filter((t) => matchesQuery(t, qNorm))
    .sort(compareTerm);

  renderStatus();
  renderList();
  renderFlowGraph();
}

function setCategoryOptions(categories) {
  const sel = $("#category");
  const current = sel.value;
  sel.innerHTML = `<option value="">全部</option>`;
  const mergedCategories = Array.from(new Set([...CATEGORY_ORDER, ...(categories || [])])).filter(Boolean);
  for (const c of mergedCategories) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  }
  sel.value = mergedCategories.includes(current) ? current : "";
}

function openDetail(t) {
  const dlg = $("#detailDialog");
  $("#detailTitle").textContent = [t.zh?.term, t.es?.term, t.abbr].filter(Boolean).join(" / ");
  $("#detailCategory").textContent = [t.category, ...(t.tags || []).slice(0, 6)].filter(Boolean).join(" · ");

  // 构建详情内容，包含上下游关联提示
  const rels = getTermRelations(t.id);
  const zhBlock = formatDetailBlock(t, "zh");
  const esBlock = formatDetailBlock(t, "es");

  $("#detailZh").textContent = zhBlock;
  $("#detailEs").textContent = esBlock;

  const meta = [];
  if (t.abbr) meta.push(`缩写/Sigla：${t.abbr}`);
  if (t.source) meta.push(`来源/Origen：${t.source}`);
  if (t.updatedAt) meta.push(`更新/Actualizado：${t.updatedAt}`);

  // 添加关联信息到 meta
  if (rels.prev.length || rels.next.length || rels.related.length) {
    const relParts = [];
    if (rels.prev.length) relParts.push(`上游：${rels.prev.map((id) => findTermById(id)?.zh?.term || id).join("、")}`);
    if (rels.next.length) relParts.push(`下游：${rels.next.map((id) => findTermById(id)?.zh?.term || id).join("、")}`);
    if (rels.related.length) relParts.push(`相关：${rels.related.map((id) => findTermById(id)?.zh?.term || id).join("、")}`);
    meta.push(relParts.join(" ｜ "));
  }

  $("#detailMeta").textContent = meta.join("  |  ");

  if (!dlg.open) dlg.showModal();
}

function closeDetail() {
  const dlg = $("#detailDialog");
  if (dlg.open) dlg.close();
}

function formatDetailBlock(t, lang) {
  const node = t[lang] || {};
  const term = node.term ? `术语：${node.term}` : "";
  const definition = node.definition ? `释义：${node.definition}` : "";
  const aliases = node.aliases && node.aliases.length ? `别名：${node.aliases.join("；")}` : "";
  const example = node.example ? `例：${node.example}` : "";
  const commonMistake = node.commonMistake ? `常见误区：${node.commonMistake}` : "";
  const practicalTip = node.practicalTip ? `实务提醒：${node.practicalTip}` : "";
  const spainExample = node.spainExample ? `场景例句：${node.spainExample}` : "";
  const note = node.note ? `备注：${node.note}` : "";

  if (lang === "es") {
    return [
      node.term ? `Término: ${node.term}` : "",
      node.definition ? `Definición: ${node.definition}` : "",
      node.aliases && node.aliases.length ? `Sinónimos: ${node.aliases.join("; ")}` : "",
      node.example ? `Ejemplo: ${node.example}` : "",
      node.commonMistake ? `Error común: ${node.commonMistake}` : "",
      node.practicalTip ? `Consejo práctico: ${node.practicalTip}` : "",
      node.spainExample ? `Ejemplo: ${node.spainExample}` : "",
      node.note ? `Nota: ${node.note}` : "",
    ].filter(Boolean).join("\n\n");
  }

  return [term, definition, aliases, example, commonMistake, practicalTip, spainExample, note]
    .filter(Boolean).join("\n\n");
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ============ 数据加载与初始化 ============
async function loadTerms() {
  const res = await fetch(`./data/terms.json?v=20260623-custom-term-v1&t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`加载失败：HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error("terms.json 结构错误：应为数组");

  state.customTerms = loadCustomTerms();
  const terms = [...json, ...state.customTerms].map(prepareTerm);

  const map = new Map();
  for (const t of terms) {
    if (!t.id) continue;
    map.set(t.id, t);
  }
  return Array.from(map.values());
}

function wireEvents() {
  $("#q").addEventListener("input", (e) => {
    state.q = e.target.value || "";
    applyFilters();
  });

  $("#category").addEventListener("change", (e) => {
    state.category = e.target.value || "";
    applyFilters();
  });

  $("#viewMode").addEventListener("change", (e) => {
    state.viewMode = e.target.value || "bilingual";
    renderList();
  });

  $("#closeDialog").addEventListener("click", closeDetail);
  $("#detailDialog").addEventListener("click", (e) => {
    if (e.target === $("#detailDialog")) closeDetail();
  });

  $("#openCustomTerm")?.addEventListener("click", openCustomTermDialog);
  $("#closeCustomTerm")?.addEventListener("click", closeCustomTermDialog);
  $("#resetCustomTerm")?.addEventListener("click", resetCustomTermForm);
  $("#exportCustomTerms")?.addEventListener("click", exportCustomTerms);
  $("#customTermForm")?.addEventListener("submit", handleCustomTermSubmit);
  $("#customTermDialog")?.addEventListener("click", (e) => {
    if (e.target === $("#customTermDialog")) closeCustomTermDialog();
  });
}

async function init() {
  try {
    wireEvents();
    state.terms = await loadTerms();
    const categories = Array.from(
      new Set(state.terms.map((t) => t.category).filter(Boolean))
    ).sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      const aKnown = ai !== -1;
      const bKnown = bi !== -1;
      if (aKnown && bKnown) return ai - bi;
      if (aKnown) return -1;
      if (bKnown) return 1;
      return a.localeCompare(b, "zh-Hans-CN");
    });
    setCategoryOptions(categories);
    renderFlowNav();
    state.filtered = state.terms.slice().sort(compareTerm);
    renderStatus();
    renderList();
    renderFlowGraph();
  } catch (err) {
    console.error(err);
    $("#status").textContent = `加载失败：${err.message}`;
  }
}

init();
