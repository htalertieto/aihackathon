/**
 * Exports a MedTranslate result (and optional follow-up conversation) as an
 * openEHR-style COMPOSITION, using the canonical JSON serialization of the
 * openEHR Reference Model (see https://openehr.org/, specifications:
 * https://specifications.openehr.org/releases/RM/latest/ehr.html#_composition_class).
 *
 * This is a best-effort, generic interoperability export intended for
 * research/demo purposes. It uses generic archetype ids (SECTION.adhoc,
 * EVALUATION.clinical_synopsis, ADMIN_ENTRY) rather than a formally published,
 * clinically-reviewed openEHR template — it has NOT been validated against a
 * real openEHR CDR/AQL and should not be treated as a certified openEHR export.
 */

function dvText(value) {
  return { _type: 'DV_TEXT', value: String(value ?? '') };
}

function codePhrase(terminologyId, codeString) {
  return {
    _type: 'CODE_PHRASE',
    terminology_id: { _type: 'TERMINOLOGY_ID', value: terminologyId },
    code_string: codeString,
  };
}

function dvCodedText(value, terminologyId, codeString) {
  return {
    _type: 'DV_CODED_TEXT',
    value,
    defining_code: codePhrase(terminologyId, codeString),
  };
}

function dvDateTime(isoString) {
  return { _type: 'DV_DATE_TIME', value: isoString };
}

function partySelf() {
  return { _type: 'PARTY_SELF' };
}

function element(nodeId, name, value) {
  return {
    _type: 'ELEMENT',
    archetype_node_id: nodeId,
    name: dvText(name),
    value: dvText(value),
  };
}

function itemTree(nodeId, name, items) {
  return {
    _type: 'ITEM_TREE',
    archetype_node_id: nodeId,
    name: dvText(name),
    items,
  };
}

// Wraps a flat ITEM_TREE in an EVALUATION — used for the plain-language
// summary/translation and for the follow-up Q&A history.
function evaluation({ nodeId, name, language, encoding, items }) {
  return {
    _type: 'EVALUATION',
    archetype_node_id: nodeId,
    name: dvText(name),
    language,
    encoding,
    subject: partySelf(),
    data: itemTree(`${nodeId}.tree`, `${name} details`, items),
  };
}

function adminEntry({ nodeId, name, language, encoding, items }) {
  return {
    _type: 'ADMIN_ENTRY',
    archetype_node_id: nodeId,
    name: dvText(name),
    language,
    encoding,
    subject: partySelf(),
    data: itemTree(`${nodeId}.tree`, `${name} details`, items),
  };
}

function section(nodeId, name, items) {
  return {
    _type: 'SECTION',
    archetype_node_id: nodeId,
    name: dvText(name),
    items,
  };
}

/**
 * Build an openEHR-style COMPOSITION JSON document from a MedTranslate
 * analysis result, optionally including the browser-only follow-up Q&A
 * history (see FollowUpChat.jsx / POST /api/followup) and basic patient info.
 *
 * @param {object} params
 * @param {object} params.result - The pipeline output (summary, keyTerms,
 *   translatedText, actionItems, disclaimer, sourceText, extractedText/transcript)
 * @param {string} params.targetLanguage - Human-readable target language name
 *   (e.g. "Spanish") used for display; the RM `language`/`encoding` fields
 *   default to English/UTF-8 metadata about the composition itself.
 * @param {Array<{role:string,text:string}>} [params.history] - Prior follow-up turns
 * @param {{id?:string,name?:string}} [params.patient] - Optional patient identifiers
 */
function buildOpenEhrComposition({ result, targetLanguage, history = [], patient = {} }) {
  if (!result || typeof result !== 'object') {
    throw new Error('result is required to build an openEHR export');
  }

  const now = new Date().toISOString();
  const language = codePhrase('ISO_639-1', 'en');
  const encoding = codePhrase('IANA_character-sets', 'UTF-8');

  const content = [];

  // Section 1: the original source material (typed text, OCR'd image/PDF text,
  // or audio transcript).
  const sourceItems = [];
  if (result.sourceText) {
    sourceItems.push(element('openEHR-EHR-ELEMENT.narrative.v1', 'Source text', result.sourceText));
  }
  if (result.extractedText) {
    sourceItems.push(
      element('openEHR-EHR-ELEMENT.narrative.v1', 'OCR-extracted text', result.extractedText),
    );
  }
  if (result.transcript) {
    sourceItems.push(element('openEHR-EHR-ELEMENT.narrative.v1', 'Audio transcript', result.transcript));
  }
  if (sourceItems.length) {
    content.push(
      section('openEHR-EHR-SECTION.adhoc.v1', 'Original document', [
        evaluation({
          nodeId: 'openEHR-EHR-EVALUATION.clinical_synopsis.v1',
          name: 'Original document contents',
          language,
          encoding,
          items: sourceItems,
        }),
      ]),
    );
  }

  // Section 2: plain-language explanation + translation.
  const explanationItems = [];
  if (result.summary) {
    explanationItems.push(element('openEHR-EHR-ELEMENT.summary.v1', 'Summary', result.summary));
  }
  if (result.translatedText) {
    explanationItems.push(
      element(
        'openEHR-EHR-ELEMENT.translation.v1',
        `Translated explanation (${targetLanguage || 'target language'})`,
        result.translatedText,
      ),
    );
  }
  if (result.disclaimer) {
    explanationItems.push(element('openEHR-EHR-ELEMENT.disclaimer.v1', 'Disclaimer', result.disclaimer));
  }
  if (explanationItems.length) {
    content.push(
      section('openEHR-EHR-SECTION.adhoc.v1', 'Plain-language explanation', [
        evaluation({
          nodeId: 'openEHR-EHR-EVALUATION.clinical_synopsis.v1',
          name: 'Patient-facing explanation',
          language,
          encoding,
          items: explanationItems,
        }),
      ]),
    );
  }

  // Section 3: key medical terms explained.
  if (Array.isArray(result.keyTerms) && result.keyTerms.length) {
    const termItems = result.keyTerms.map((kt, i) =>
      element('openEHR-EHR-ELEMENT.key_term.v1', kt.term || `Term ${i + 1}`, kt.plainMeaning || ''),
    );
    content.push(
      section('openEHR-EHR-SECTION.adhoc.v1', 'Key medical terms', [
        evaluation({
          nodeId: 'openEHR-EHR-EVALUATION.clinical_synopsis.v1',
          name: 'Key terms explained',
          language,
          encoding,
          items: termItems,
        }),
      ]),
    );
  }

  // Section 4: recommended next actions.
  if (Array.isArray(result.actionItems) && result.actionItems.length) {
    const actionItemsEls = result.actionItems.map((item, i) =>
      element('openEHR-EHR-ELEMENT.action_item.v1', `Action ${i + 1}`, item),
    );
    content.push(
      section('openEHR-EHR-SECTION.adhoc.v1', 'Recommended next steps', [
        evaluation({
          nodeId: 'openEHR-EHR-EVALUATION.clinical_synopsis.v1',
          name: 'Action items',
          language,
          encoding,
          items: actionItemsEls,
        }),
      ]),
    );
  }

  // Section 5: browser-only follow-up conversation (if any was provided).
  if (Array.isArray(history) && history.length) {
    const turnItems = history.map((turn, i) =>
      element(
        'openEHR-EHR-ELEMENT.conversation_turn.v1',
        `Turn ${i + 1} (${turn.role === 'assistant' ? 'MedTranslate' : 'Patient'})`,
        turn.text || '',
      ),
    );
    content.push(
      section('openEHR-EHR-SECTION.adhoc.v1', 'Follow-up conversation', [
        adminEntry({
          nodeId: 'openEHR-EHR-ADMIN_ENTRY.conversation.v1',
          name: 'Follow-up Q&A (browser session only, not persisted server-side)',
          language,
          encoding,
          items: turnItems,
        }),
      ]),
    );
  }

  return {
    _type: 'COMPOSITION',
    name: dvText('MedTranslate patient explanation'),
    archetype_node_id: 'openEHR-EHR-COMPOSITION.report.v1',
    language,
    territory: codePhrase('ISO_3166-1', 'US'),
    category: dvCodedText('event', 'openehr', '433'),
    composer: {
      _type: 'PARTY_IDENTIFIED',
      name: 'MedTranslate (AI-assisted patient education tool)',
    },
    context: {
      _type: 'EVENT_CONTEXT',
      start_time: dvDateTime(now),
      setting: dvCodedText('other care', 'openehr', '238'),
    },
    subject: patient?.id || patient?.name
      ? { _type: 'PARTY_IDENTIFIED', name: patient.name, external_ref: patient.id ? {
          id: { _type: 'GENERIC_ID', value: patient.id, scheme: 'medtranslate' },
          namespace: 'medtranslate',
          type: 'PERSON',
        } : undefined }
      : partySelf(),
    content,
  };
}

module.exports = { buildOpenEhrComposition };
