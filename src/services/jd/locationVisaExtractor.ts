import type { RemotePolicy, WorkAuthorizationType } from '../../types/job.js';

export interface LocationVisaResult {
  country: string;
  city?: string;
  location_string: string;
  remote_policy: RemotePolicy;
  visa_status: WorkAuthorizationType;
  visa_reasoning: string;
}

export class LocationVisaExtractor {
  public static extract(jdText: string, metadataLocation?: string): LocationVisaResult {
    const text = (jdText + ' ' + (metadataLocation || '')).toLowerCase();

    // 1. Detect Remote Policy
    let remotePolicy: RemotePolicy = 'UNSPECIFIED';
    if (
      text.includes('remote worldwide') ||
      text.includes('work from anywhere') ||
      text.includes('anywhere in the world') ||
      text.includes('global remote') ||
      text.includes('100% remote') ||
      text.includes('fully remote')
    ) {
      remotePolicy = 'REMOTE_WORLDWIDE';
    } else if (
      text.includes('remote (eu)') ||
      text.includes('remote in europe') ||
      text.includes('remote uk') ||
      text.includes('remote - us') ||
      text.includes('remote within') ||
      text.includes('timezone') ||
      text.includes('gmt') ||
      text.includes('cet')
    ) {
      remotePolicy = 'REMOTE_REGIONAL';
    } else if (text.includes('hybrid') || text.includes('days in office') || text.includes('days per week in office')) {
      remotePolicy = 'HYBRID';
    } else if (text.includes('on-site') || text.includes('onsite') || text.includes('in-office')) {
      remotePolicy = 'ON_SITE';
    } else if (text.includes('remote')) {
      remotePolicy = 'REMOTE_WORLDWIDE';
    }

    // 2. Detect Visa & Work Authorization
    let visaStatus: WorkAuthorizationType = 'UNSPECIFIED_NEEDS_CHECK';
    let visaReasoning = 'No explicit visa sponsorship or local-only restriction specified in JD text.';

    const sponsoredSignals = [
      'visa sponsorship provided',
      'visa sponsorship available',
      'relocation package',
      'relocation assistance',
      'we sponsor visas',
      'willing to relocate',
      'relocation support provided',
      'open to visa sponsorship'
    ];

    const localOnlySignals = [
      'no visa sponsorship',
      'cannot sponsor',
      'must have right to work',
      'must be legally authorized to work in',
      'without sponsorship',
      'unable to sponsor',
      'uk right to work required',
      'eu citizenship required',
      'valid work permit required',
      'no sponsorship'
    ];

    const contractorSignals = [
      'b2b contract',
      'contractor',
      'freelance',
      'hire via deel',
      'hire via remote.com',
      'contract opportunity',
      'independent contractor',
      'contract role'
    ];

    if (localOnlySignals.some(s => text.includes(s))) {
      visaStatus = 'LOCAL_AUTH_REQUIRED';
      visaReasoning = 'JD explicitly specifies candidate must have existing local work authorization with no sponsorship provided.';
    } else if (sponsoredSignals.some(s => text.includes(s))) {
      visaStatus = 'VISA_SPONSORED';
      visaReasoning = 'JD explicitly advertises visa sponsorship or relocation assistance package.';
    } else if (contractorSignals.some(s => text.includes(s)) || remotePolicy === 'REMOTE_WORLDWIDE') {
      visaStatus = 'REMOTE_CONTRACT_OPEN';
      visaReasoning = 'Role allows remote worldwide contracting (B2B / EOR) without local residency requirement.';
    }

    // 3. Detect Country & City
    const countries = [
      { name: 'United Kingdom', keywords: ['united kingdom', 'uk', 'london', 'manchester'] },
      { name: 'United Arab Emirates', keywords: ['united arab emirates', 'uae', 'dubai', 'abu dhabi'] },
      { name: 'Germany', keywords: ['germany', 'berlin', 'munich', 'frankfurt', 'hamburg'] },
      { name: 'France', keywords: ['france', 'paris', 'lyon'] },
      { name: 'Netherlands', keywords: ['netherlands', 'amsterdam', 'rotterdam', 'utrecht'] },
      { name: 'Luxembourg', keywords: ['luxembourg'] },
      { name: 'United States', keywords: ['united states', 'usa', 'new york', 'san francisco', 'austin', 'seattle'] },
      { name: 'Ireland', keywords: ['ireland', 'dublin'] },
      { name: 'Spain', keywords: ['spain', 'madrid', 'barcelona'] },
      { name: 'Switzerland', keywords: ['switzerland', 'zurich', 'geneva'] }
    ];

    let detectedCountry = 'Global / Remote';
    let detectedCity: string | undefined = undefined;

    for (const c of countries) {
      if (c.keywords.some(k => text.includes(k))) {
        detectedCountry = c.name;
        // find if city matches
        const cityMatch = c.keywords.find(k => k !== c.name.toLowerCase() && k.length > 3 && text.includes(k));
        if (cityMatch) {
          detectedCity = cityMatch.charAt(0).toUpperCase() + cityMatch.slice(1);
        }
        break;
      }
    }

    const locationString = metadataLocation || (detectedCity ? `${detectedCity}, ${detectedCountry}` : detectedCountry);

    return {
      country: detectedCountry,
      city: detectedCity,
      location_string: locationString,
      remote_policy: remotePolicy,
      visa_status: visaStatus,
      visa_reasoning: visaReasoning,
    };
  }
}
