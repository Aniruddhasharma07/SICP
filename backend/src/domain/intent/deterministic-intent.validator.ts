import {
  ProblemIntentClassification,
  IntentNextAction,
  ProblemIntentResultDto,
  ProblemIntentSignals,
  ValidateIntentPayload,
} from '@sicp/shared';

export class DeterministicIntentValidator {
  private static readonly TEST_PATTERNS = [
    /^test\b/i,
    /^testing(\s+testing)?(\s+123)?$/i,
    /^check\b/i,
    /^asdf/i,
    /^qwerty/i,
    /^xyz\s*abc/i,
    /^foo\s*bar/i,
    /^hello\s*world/i,
    /^sample(\s+problem)?$/i,
    /^temp(\s+test)?$/i,
    /^lorem\s+ipsum/i,
  ];

  private static readonly CASUAL_PATTERNS = [
    /^(hi|hello|hey|good\s+(morning|afternoon|evening)|namaste)\b/i,
    /^(how\s+are\s+you|who\s+are\s+you|what('?s|\s+is)\s+up)/i,
    /^i\s+love\s+[a-z\s]+/i,
    /^(pizza|burger|coffee|tea|food)\s+(is|was|are)\s+(good|great|bad|delicious|nice)/i,
    /^(i\s+am|i'm)\s+(happy|sad|bored|tired|hungry|eating|coding|learning)/i,
    /^(nice|good|great|awesome|cool|ok|okay|fine|yes|no)\s*$/i,
    /^(lol|haha|hehe|lmao|rofl|xd)+$/i,
    /^weather\s+is\s+(nice|good|bad|rainy|hot|cold)/i,
  ];

  private static readonly SOCIETAL_KEYWORDS = [
    'water', 'pani', 'paani', 'jal', 'drinking water', 'contamination', 'leakage',
    'pipe', 'drainage', 'gutter', 'sewer', 'sewage', 'naali', 'overflow',
    'road', 'sadak', 'rasta', 'pothole', 'potholes', 'street', 'traffic', 'accident',
    'bridge', 'crossing', 'gaddha', 'gaddhe', 'path', 'highway',
    'garbage', 'waste', 'kachra', 'trash', 'dumping', 'litter', 'smell', 'stench',
    'cleanliness', 'safai', 'dustbin',
    'electricity', 'power', 'bijli', 'powercut', 'blackout', 'voltage', 'transformer',
    'streetlight', 'light', 'andhera', 'darkness',
    'hospital', 'clinic', 'doctor', 'dawa', 'swasthya', 'disease', 'dengue', 'malaria',
    'mosquitos', 'stagnant', 'hazard', 'danger', 'open wire', 'tuta', 'toota', 'broken',
    'school', 'ration', 'pension', 'samasya', 'dikkat', 'bhrashtachar', 'corruption',
    'facility', 'complaint', 'delay', 'illegal',
  ];

  private static readonly LOCATION_INDICATORS = [
    'near', 'at', 'in', 'behind', 'opposite', 'sector', 'ward', 'colony', 'mohalla',
    'nagar', 'village', 'gram', 'block', 'district', 'street', 'cross', 'road',
    'road kharab', 'pass', 'ke paas', 'ke samne',
  ];

  public static validate(input: ValidateIntentPayload): ProblemIntentResultDto {
    const rawTitle = (input.title || '').trim();
    const rawDesc = (input.description || '').trim();
    const combined = `${rawTitle} ${rawDesc}`.trim();
    const lowerTitle = rawTitle.toLowerCase();
    const lowerCombined = combined.toLowerCase();

    const signals: ProblemIntentSignals = {
      meaningfulLanguage: true,
      societalContext: false,
      problemStatement: false,
      affectedPopulation: false,
      locationContext: false,
      actionableIssue: false,
    };

    // 1. Empty or whitespace only
    if (rawTitle.length === 0) {
      return {
        classification: ProblemIntentClassification.GIBBERISH,
        confidence: 0.99,
        problemIntent: false,
        qualityScore: 0.0,
        reason: 'The problem title is empty.',
        suggestedClarification: 'Please state the civic, societal, or community issue clearly.',
        missingContext: ['Problem title', 'Description of the issue'],
        signals: { ...signals, meaningfulLanguage: false },
        nextAction: IntentNextAction.BLOCKED,
        validationMode: 'deterministic',
      };
    }

    // 2. Pure repetitive character smash (e.g. "aaaaaa", "asdfasdfasdf")
    if (/^(.)\1{4,}$/.test(rawTitle.replace(/\s+/g, ''))) {
      return {
        classification: ProblemIntentClassification.GIBBERISH,
        confidence: 0.98,
        problemIntent: false,
        qualityScore: 0.05,
        reason: 'The input consists of repetitive characters.',
        suggestedClarification: 'Please provide a meaningful explanation of the community problem you wish to report.',
        missingContext: ['Genuine societal problem details'],
        signals: { ...signals, meaningfulLanguage: false },
        nextAction: IntentNextAction.BLOCKED,
        validationMode: 'deterministic',
      };
    }

    // 3. Numeric or punctuation only (e.g. "123456789", "!@#$%")
    const alphaCount = (rawTitle.match(/[a-zA-Z\u0900-\u097F]/g) || []).length;
    if (alphaCount === 0 || alphaCount < rawTitle.length * 0.25) {
      return {
        classification: ProblemIntentClassification.GIBBERISH,
        confidence: 0.96,
        problemIntent: false,
        qualityScore: 0.05,
        reason: 'The input contains mostly numbers or symbols without meaningful text.',
        suggestedClarification: 'Please write words describing the specific issue in your neighborhood or community.',
        missingContext: ['Text description of the civic problem'],
        signals: { ...signals, meaningfulLanguage: false },
        nextAction: IntentNextAction.BLOCKED,
        validationMode: 'deterministic',
      };
    }

    // 4. Keyboard smash detection (e.g. "asdfghjkl", "qwertyuiop")
    const smashes = ['asdfghjkl', 'asdfghjk', 'asdfgh', 'qwertyuiop', 'zxcvbnm', 'lkjhgfdsa'];
    const isSmash = smashes.some(s => lowerTitle.replace(/\s+/g, '').includes(s));
    if (isSmash && rawTitle.split(/\s+/).length <= 2) {
      return {
        classification: ProblemIntentClassification.GIBBERISH,
        confidence: 0.97,
        problemIntent: false,
        qualityScore: 0.05,
        reason: 'The input appears to be random keyboard typing.',
        suggestedClarification: 'Please type the actual civic challenge you want authorities or solvers to address.',
        missingContext: ['Real problem statement'],
        signals: { ...signals, meaningfulLanguage: false },
        nextAction: IntentNextAction.BLOCKED,
        validationMode: 'deterministic',
      };
    }

    // Vowel ratio in English
    const isEnglishOnly = /^[a-zA-Z\s]+$/.test(rawTitle);
    if (isEnglishOnly && rawTitle.length >= 7) {
      const vowels = (rawTitle.match(/[aeiouAEIOU]/g) || []).length;
      if (vowels === 0 || vowels / rawTitle.replace(/\s+/g, '').length < 0.12) {
        return {
          classification: ProblemIntentClassification.GIBBERISH,
          confidence: 0.94,
          problemIntent: false,
          qualityScore: 0.05,
          reason: 'The text appears to be arbitrary consonant strings rather than natural language.',
          suggestedClarification: 'Please write your complaint in natural English, Hindi, or your preferred language.',
          missingContext: ['Natural language problem description'],
          signals: { ...signals, meaningfulLanguage: false },
          nextAction: IntentNextAction.BLOCKED,
          validationMode: 'deterministic',
        };
      }
    }

    // 5. Test submissions
    for (const testPattern of this.TEST_PATTERNS) {
      if (testPattern.test(rawTitle.trim())) {
        return {
          classification: ProblemIntentClassification.TEST_INPUT,
          confidence: 0.95,
          problemIntent: false,
          qualityScore: 0.1,
          reason: 'This appears to be a test entry or placeholder.',
          suggestedClarification: 'SICP is a live portal for real-world societal challenges. Please enter a genuine community problem.',
          missingContext: ['Authentic societal challenge'],
          signals: { ...signals, meaningfulLanguage: true },
          nextAction: IntentNextAction.BLOCKED,
          validationMode: 'deterministic',
        };
      }
    }

    // 6. Casual statements
    for (const casualPattern of this.CASUAL_PATTERNS) {
      if (casualPattern.test(rawTitle.trim())) {
        return {
          classification: ProblemIntentClassification.NON_PROBLEM,
          confidence: 0.95,
          problemIntent: false,
          qualityScore: 0.2,
          reason: 'This looks like a casual remark, greeting, or personal comment rather than a community challenge.',
          suggestedClarification: 'Please tell us about a specific civic, environmental, infrastructure, or public service problem.',
          missingContext: ['Community problem details', 'Who is affected', 'Action needed'],
          signals: { ...signals, meaningfulLanguage: true },
          nextAction: IntentNextAction.BLOCKED,
          validationMode: 'deterministic',
        };
      }
    }

    // 7. Societal keywords check
    const matchedKeywords = this.SOCIETAL_KEYWORDS.filter(kw => lowerCombined.includes(kw));
    const hasSocietalWords = matchedKeywords.length > 0;
    const hasLocation = this.LOCATION_INDICATORS.some(loc => lowerCombined.includes(loc)) ||
      Boolean(rawDesc.length > 20) || Boolean(input.district) || Boolean(input.state);
    const hasImpact = /\b(\d+|people|family|families|residents|citizens|children|students|log|bache|school)\b/i.test(lowerCombined);

    signals.societalContext = hasSocietalWords;
    signals.problemStatement = hasSocietalWords;
    signals.actionableIssue = hasSocietalWords;
    signals.locationContext = hasLocation;
    signals.affectedPopulation = hasImpact;

    // High confidence legitimate problem
    if (hasSocietalWords && (rawTitle.length >= 10 || combined.length >= 20)) {
      return {
        classification: ProblemIntentClassification.VALID_PROBLEM,
        confidence: 0.88,
        problemIntent: true,
        qualityScore: hasLocation && hasImpact ? 0.9 : 0.75,
        reason: 'Clear societal problem addressing community infrastructure or civic welfare.',
        suggestedClarification: undefined,
        missingContext: hasLocation ? [] : ['Exact street or area location'],
        signals,
        nextAction: IntentNextAction.CONTINUE_ANALYSIS,
        validationMode: 'deterministic',
      };
    }

    // Very short but legitimate civic problem (e.g. "Road kharab hai", "broken pipe")
    if (hasSocietalWords && rawTitle.length < 10) {
      return {
        classification: ProblemIntentClassification.UNCLEAR_PROBLEM,
        confidence: 0.75,
        problemIntent: true,
        qualityScore: 0.5,
        reason: 'Brief civic mention that requires additional details to be actionable.',
        suggestedClarification: 'You mentioned a civic issue. Please add a few more words explaining the location and how it affects the community.',
        missingContext: ['Location or ward', 'Detailed description', 'Duration of problem'],
        signals,
        nextAction: IntentNextAction.IMPROVE_SUBMISSION,
        validationMode: 'deterministic',
      };
    }

    // Short phrase with no societal keywords
    const wordCount = rawTitle.split(/\s+/).filter(Boolean).length;
    if (wordCount <= 3 && !hasSocietalWords) {
      return {
        classification: ProblemIntentClassification.NON_PROBLEM,
        confidence: 0.85,
        problemIntent: false,
        qualityScore: 0.15,
        reason: 'The submission does not specify an actionable societal or civic problem.',
        suggestedClarification: 'Please describe a specific problem affecting public safety, health, infrastructure, or community welfare.',
        missingContext: ['Specific civic issue', 'Location', 'Affected community'],
        signals,
        nextAction: IntentNextAction.BLOCKED,
        validationMode: 'deterministic',
      };
    }

    // Ambiguous
    return {
      classification: ProblemIntentClassification.UNCLEAR_PROBLEM,
      confidence: 0.50,
      problemIntent: true,
      qualityScore: 0.45,
      reason: 'The statement requires additional context to determine the specific societal impact.',
      suggestedClarification: 'Please ensure your problem statement clearly identifies what is happening and where.',
      missingContext: ['Severity indicator', 'Location'],
      signals,
      nextAction: IntentNextAction.IMPROVE_SUBMISSION,
      validationMode: 'deterministic',
    };
  }
}
