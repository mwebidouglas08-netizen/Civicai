import { CATEGORIES, authorityFor } from "../categories.js";
import { STRINGS } from "../i18n.js";

/**
 * Generate a formal complaint (or escalation) letter as plain text.
 * Templates are tuned per-language for tone and conventions.
 *
 * @param {string} lang - language code (en, fr, ar, es, pt, sw)
 * @param {object} params
 * @param {string} params.caseId
 * @param {string} params.category
 * @param {'high'|'medium'|'low'} params.urgency
 * @param {string} params.locationLabel - human-readable area, e.g. "Downtown, Lagos, Nigeria"
 * @param {string} params.description
 * @param {string} params.dateStr
 * @param {boolean} [params.isEscalation]
 * @param {number} [params.daysOpen]
 * @param {number} [params.memberCount]
 */
export function generateLetter(lang, params) {
  const {
    caseId, category, urgency, locationLabel, description,
    dateStr, isEscalation, daysOpen = 0, memberCount = 1,
  } = params;

  const t = STRINGS[lang] || STRINGS.en;
  const catLabel = t[CATEGORIES[category].labelKey];
  const authority = authorityFor(category, lang, locationLabel);
  const urgencyLabel = urgency === "high"
    ? t.severity_high
    : urgency === "low" ? t.severity_low : t.severity_medium;

  const builders = { en: buildEn, fr: buildFr, ar: buildAr, es: buildEs, pt: buildPt, sw: buildSw };
  const build = builders[lang] || builders.en;

  return build({
    t, caseId, catLabel, authority, urgency, urgencyLabel, locationLabel,
    description, dateStr, isEscalation, daysOpen, memberCount,
  });
}

function buildEn({ t, caseId, catLabel, authority, urgencyLabel, locationLabel, description, dateStr, isEscalation, daysOpen, memberCount }) {
  if (isEscalation) {
    return `${t.addressed_to}: ${authority}
Date: ${dateStr}
${t.re_line}: Urgent follow-up regarding Case No. ${caseId} — No response after ${daysOpen} days

To Whom It May Concern,

We write as a formal follow-up to the case referenced above, concerning a "${catLabel}" issue in ${locationLabel || "the affected area"}, originally submitted with no update or response received from your office within a reasonable response period.

This case represents an aggregated set of ${memberCount} independent reports from affected residents, underscoring the collective and urgent nature of this matter. Continued lack of response may warrant review under applicable administrative accountability frameworks.

We formally request that you:
1. Confirm receipt of this follow-up within 5 working days.
2. Provide a clear update on actions taken or planned.
3. Provide a specific timeline for resolution.

${t.sincerely}
${t.citizen_signoff}
On behalf of residents (Aggregated Case No. ${caseId})`;
  }
  return `${t.addressed_to}: ${authority}
Date: ${dateStr}
${t.re_line}: Formal complaint regarding a "${catLabel}" issue in ${locationLabel || "the affected area"} — Case No. ${caseId}

To Whom It May Concern,

I am writing to formally report the following issue, which directly affects residents of ${locationLabel || "this area"}:

"${description}"

Given the nature of this issue and its level of urgency (${urgencyLabel}), I respectfully request that your office take the necessary action at the earliest opportunity, in accordance with applicable regulations requiring public authorities to respond to citizen complaints within a reasonable period.

I would be grateful if you could:
1. Acknowledge receipt of this complaint.
2. Assign a responsible department to follow up on this matter.
3. Provide a timeline for resolution.

${t.sincerely}
${t.citizen_signoff}
Case Reference: ${caseId}`;
}

function buildFr({ t, caseId, catLabel, authority, urgencyLabel, locationLabel, description, dateStr, isEscalation, daysOpen, memberCount }) {
  if (isEscalation) {
    return `${t.addressed_to} : ${authority}
Date : ${dateStr}
${t.re_line} : Relance urgente concernant le dossier n° ${caseId} — sans réponse depuis ${daysOpen} jours

Madame, Monsieur,

Par la présente, nous vous adressons une relance officielle concernant le dossier référencé ci-dessus, relatif à un problème de catégorie « ${catLabel} » à ${locationLabel || "l'endroit concerné"}, déposé précédemment sans qu'aucune mise à jour ni réponse n'ait été reçue de vos services dans un délai raisonnable.

Ce dossier regroupe ${memberCount} signalements indépendants de résidents concernés, soulignant le caractère collectif et urgent de la situation. L'absence de réponse persistante pourrait justifier un examen au titre des cadres de responsabilité administrative applicables.

Nous demandons formellement :
1. La confirmation de réception de cette relance sous 5 jours ouvrables.
2. Une mise à jour claire sur les mesures prises ou envisagées.
3. Un calendrier précis de résolution.

${t.sincerely}
${t.citizen_signoff}
Au nom des résidents (dossier groupé n° ${caseId})`;
  }
  return `${t.addressed_to} : ${authority}
Date : ${dateStr}
${t.re_line} : Plainte officielle concernant un problème de catégorie « ${catLabel} » à ${locationLabel || "l'endroit concerné"} — Dossier n° ${caseId}

Madame, Monsieur,

Par la présente, je porte à votre connaissance le problème suivant, qui affecte directement les résidents de ${locationLabel || "cette zone"} :

« ${description} »

Compte tenu de la nature de ce problème et de son degré d'urgence (${urgencyLabel}), je sollicite de votre administration la mise en œuvre des mesures nécessaires dans les meilleurs délais, conformément à la réglementation en vigueur imposant aux services compétents de répondre aux plaintes des administrés dans un délai raisonnable.

Je vous prie de bien vouloir :
1. Accuser réception de la présente plainte.
2. Désigner un service responsable du suivi de ce dossier.
3. Nous communiquer un calendrier de traitement.

${t.sincerely}
${t.citizen_signoff}
Référence du dossier : ${caseId}`;
}

function buildAr({ t, caseId, catLabel, authority, urgencyLabel, locationLabel, description, dateStr, isEscalation, daysOpen, memberCount }) {
  if (isEscalation) {
    return `${t.addressed_to}: ${authority}
التاريخ: ${dateStr}
${t.re_line}: متابعة عاجلة بشأن القضية رقم ${caseId} — لم يصدر رد منذ ${daysOpen} يومًا

السادة المحترمون،

نكتب إليكم بصفة متابعة رسمية بخصوص القضية المشار إليها أعلاه، والمتعلقة بمشكلة من فئة "${catLabel}" في ${locationLabel || "المنطقة المتضررة"}، والتي تم تقديمها بتاريخ سابق دون ورود أي تحديث أو رد من جهتكم خلال مدة معقولة.

تمثل هذه القضية مجموعة من ${memberCount} بلاغًا مستقلاً من سكان متضررين، مما يبرز الطابع الجماعي والملح للمشكلة. استمرار عدم الاستجابة قد يستوجب مراجعة وفقًا لأطر المساءلة الإدارية المعمول بها.

نطالب رسميًا بما يلي:
1. تأكيد استلام هذه المتابعة خلال 5 أيام عمل.
2. تقديم تحديث واضح حول الإجراءات المتخذة أو المزمع اتخاذها.
3. تحديد جدول زمني محدد للحل.

${t.sincerely}
${t.citizen_signoff}
بالنيابة عن السكان (قضية مجمّعة، رقم ${caseId})`;
  }
  return `${t.addressed_to}: ${authority}
التاريخ: ${dateStr}
${t.re_line}: شكوى رسمية بخصوص مشكلة من فئة "${catLabel}" في ${locationLabel || "المنطقة المتضررة"} — رقم القضية ${caseId}

السادة المحترمون،

تحية طيبة وبعد،

أتقدم إليكم بهذه الشكوى الرسمية للإبلاغ عن المشكلة التالية، والتي تؤثر بشكل مباشر على سكان ${locationLabel || "هذه المنطقة"}:

"${description}"

نظرًا لطبيعة هذه المشكلة ومستوى إلحاحها (${urgencyLabel})، نلتمس من سلطتكم الموقرة اتخاذ الإجراءات اللازمة في أقرب وقت ممكن، وذلك وفقًا للوائح المعمول بها التي تُلزم الجهات المعنية بالاستجابة لشكاوى المواطنين خلال مدة معقولة.

نرجو منكم التكرم بما يلي:
1. الإفادة باستلام هذه الشكوى.
2. تعيين جهة مسؤولة لمتابعة الملف.
3. تزويدنا بجدول زمني للمعالجة.

${t.sincerely}
${t.citizen_signoff}
رقم القضية المرجعي: ${caseId}`;
}

function buildEs({ t, caseId, catLabel, authority, urgencyLabel, locationLabel, description, dateStr, isEscalation, daysOpen, memberCount }) {
  if (isEscalation) {
    return `${t.addressed_to}: ${authority}
Fecha: ${dateStr}
${t.re_line}: Seguimiento urgente sobre el caso n.º ${caseId} — Sin respuesta tras ${daysOpen} días

A quien corresponda:

Les escribimos como seguimiento formal al caso referido anteriormente, relativo a un problema de la categoría "${catLabel}" en ${locationLabel || "la zona afectada"}, presentado previamente sin haber recibido actualización ni respuesta de su oficina dentro de un plazo razonable.

Este caso representa un conjunto agregado de ${memberCount} reportes independientes de residentes afectados, lo que subraya el carácter colectivo y urgente de este asunto. La falta continua de respuesta podría justificar una revisión bajo los marcos de rendición de cuentas administrativa aplicables.

Solicitamos formalmente que:
1. Confirmen la recepción de este seguimiento dentro de 5 días hábiles.
2. Proporcionen una actualización clara sobre las medidas tomadas o previstas.
3. Indiquen un plazo concreto para la resolución.

${t.sincerely}
${t.citizen_signoff}
En representación de los residentes (Caso agregado n.º ${caseId})`;
  }
  return `${t.addressed_to}: ${authority}
Fecha: ${dateStr}
${t.re_line}: Queja formal sobre un problema de la categoría "${catLabel}" en ${locationLabel || "la zona afectada"} — Caso n.º ${caseId}

A quien corresponda:

Por medio de la presente, deseo reportar formalmente el siguiente problema, que afecta directamente a los residentes de ${locationLabel || "esta zona"}:

"${description}"

Dada la naturaleza de este problema y su nivel de urgencia (${urgencyLabel}), solicito respetuosamente que su oficina tome las medidas necesarias a la mayor brevedad posible, conforme a la normativa aplicable que exige a las autoridades públicas responder a las quejas ciudadanas dentro de un plazo razonable.

Agradecería que pudieran:
1. Acusar recibo de esta queja.
2. Asignar un departamento responsable del seguimiento.
3. Proporcionar un plazo de resolución.

${t.sincerely}
${t.citizen_signoff}
Referencia del caso: ${caseId}`;
}

function buildPt({ t, caseId, catLabel, authority, urgencyLabel, locationLabel, description, dateStr, isEscalation, daysOpen, memberCount }) {
  if (isEscalation) {
    return `${t.addressed_to}: ${authority}
Data: ${dateStr}
${t.re_line}: Seguimento urgente sobre o caso n.º ${caseId} — Sem resposta há ${daysOpen} dias

A quem possa interessar,

Escrevemos como seguimento formal ao caso acima referido, relativo a um problema da categoria "${catLabel}" em ${locationLabel || "a área afetada"}, submetido anteriormente sem qualquer atualização ou resposta recebida dentro de um prazo razoável.

Este caso representa um conjunto agregado de ${memberCount} reportes independentes de residentes afetados, sublinhando a natureza coletiva e urgente deste assunto. A continuação da falta de resposta pode justificar uma revisão ao abrigo dos quadros de responsabilização administrativa aplicáveis.

Solicitamos formalmente que:
1. Confirmem a receção deste seguimento no prazo de 5 dias úteis.
2. Forneçam uma atualização clara sobre as medidas tomadas ou previstas.
3. Indiquem um prazo concreto para a resolução.

${t.sincerely}
${t.citizen_signoff}
Em nome dos residentes (Caso agregado n.º ${caseId})`;
  }
  return `${t.addressed_to}: ${authority}
Data: ${dateStr}
${t.re_line}: Reclamação formal sobre um problema da categoria "${catLabel}" em ${locationLabel || "a área afetada"} — Caso n.º ${caseId}

A quem possa interessar,

Venho por este meio reportar formalmente o seguinte problema, que afeta diretamente os residentes de ${locationLabel || "esta área"}:

"${description}"

Dada a natureza deste problema e o seu nível de urgência (${urgencyLabel}), solicito respeitosamente que o vosso gabinete tome as medidas necessárias com a maior brevidade possível, em conformidade com a regulamentação aplicável que exige que as autoridades públicas respondam às reclamações dos cidadãos num prazo razoável.

Agradeceria que pudessem:
1. Confirmar a receção desta reclamação.
2. Atribuir um departamento responsável pelo acompanhamento.
3. Fornecer um prazo para a resolução.

${t.sincerely}
${t.citizen_signoff}
Referência do caso: ${caseId}`;
}

function buildSw({ t, caseId, catLabel, authority, urgencyLabel, locationLabel, description, dateStr, isEscalation, daysOpen, memberCount }) {
  if (isEscalation) {
    return `${t.addressed_to}: ${authority}
Tarehe: ${dateStr}
${t.re_line}: Ufuatiliaji wa dharura kuhusu Kesi Na. ${caseId} — Hakuna jibu kwa siku ${daysOpen}

Kwa Anayehusika,

Tunaandika kama ufuatiliaji rasmi wa kesi iliyotajwa hapo juu, kuhusu tatizo la aina "${catLabel}" katika ${locationLabel || "eneo lililoathirika"}, lililowasilishwa awali bila sasisho au jibu kupokelewa kutoka ofisi yenu ndani ya muda unaofaa.

Kesi hii inawakilisha jumla ya ripoti ${memberCount} huru kutoka kwa wakazi walioathirika, ikisisitiza hali ya pamoja na ya dharura ya jambo hili. Kuendelea kutopata jibu kunaweza kuhitaji ukaguzi chini ya mifumo ya uwajibikaji wa kiutawala inayotumika.

Tunaomba rasmi:
1. Mthibitishe kupokea ufuatiliaji huu ndani ya siku 5 za kazi.
2. Mtoe sasisho wazi kuhusu hatua zilizochukuliwa au zilizopangwa.
3. Mtoe ratiba mahususi ya utatuzi.

${t.sincerely}
${t.citizen_signoff}
Kwa niaba ya wakazi (Kesi iliyounganishwa Na. ${caseId})`;
  }
  return `${t.addressed_to}: ${authority}
Tarehe: ${dateStr}
${t.re_line}: Malalamiko rasmi kuhusu tatizo la aina "${catLabel}" katika ${locationLabel || "eneo lililoathirika"} — Kesi Na. ${caseId}

Kwa Anayehusika,

Naandika kuripoti rasmi tatizo lifuatalo, ambalo linaathiri moja kwa moja wakazi wa ${locationLabel || "eneo hili"}:

"${description}"

Kutokana na hali ya tatizo hili na kiwango chake cha dharura (${urgencyLabel}), naomba kwa heshima ofisi yenu ichukue hatua muhimu haraka iwezekanavyo, kwa mujibu wa kanuni zinazohitaji mamlaka za umma kujibu malalamiko ya wananchi ndani ya muda unaofaa.

Ningeshukuru kama mngeweza:
1. Kuthibitisha kupokea malalamiko haya.
2. Kuteua idara inayohusika kufuatilia jambo hili.
3. Kutoa ratiba ya utatuzi.

${t.sincerely}
${t.citizen_signoff}
Kumbukumbu ya Kesi: ${caseId}`;
}
