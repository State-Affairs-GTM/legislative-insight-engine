// Topic taxonomy v1 — used by the extraction script to classify bills.
// Mirrors phase0/topic_taxonomy_v1.yaml. When the YAML changes, update this too.

const TAXONOMY = [
  { key: 'budget',         label: 'Budget & Appropriations',  keywords: ['appropriation', 'budget', 'fiscal year', 'fund transfer', 'general fund', 'amended budget'] },
  { key: 'taxes',          label: 'Taxes & Revenue',          keywords: ['tax credit', 'tax exemption', 'sales tax', 'income tax', 'property tax', 'tax rate', 'revenue'] },
  { key: 'education',      label: 'Education',                keywords: ['school', 'teacher', 'student', 'curriculum', 'university', 'college', 'k-12', 'higher education'] },
  { key: 'healthcare',     label: 'Healthcare',               keywords: ['medicaid', 'medicare', 'health insurance', 'hospital', 'patient', 'medical', 'health care', 'pharmacy'] },
  { key: 'public_safety',  label: 'Public Safety & Criminal Justice', keywords: ['sentencing', 'parole', 'probation', 'criminal', 'felony', 'misdemeanor', 'police', 'law enforcement'] },
  { key: 'firearms',       label: 'Firearms',                 keywords: ['firearm', 'gun', 'concealed carry', 'rifle', 'pistol', 'weapon'] },
  { key: 'elections',      label: 'Elections & Voting',       keywords: ['election', 'voter', 'ballot', 'voting', 'absentee', 'primary election', 'registration'] },
  { key: 'transportation', label: 'Transportation',           keywords: ['highway', 'transit', 'transportation', 'department of transportation', 'dot', 'motor vehicle', 'driver'] },
  { key: 'environment',    label: 'Environment & Natural Res.', keywords: ['environment', 'pollution', 'conservation', 'wildlife', 'forestry', 'water quality', 'emissions'] },
  { key: 'energy',         label: 'Energy & Utilities',       keywords: ['utility', 'electric', 'natural gas', 'solar', 'wind', 'renewable', 'public service commission'] },
  { key: 'labor',          label: 'Labor & Employment',       keywords: ['employee', 'wage', 'unemployment', 'workers compensation', 'labor', 'overtime'] },
  { key: 'family',         label: 'Family & Children',        keywords: ['adoption', 'foster', 'child welfare', 'custody', 'guardian ad litem', 'juvenile'] },
  { key: 'housing',        label: 'Housing & Land Use',       keywords: ['housing', 'zoning', 'landlord', 'tenant', 'eviction', 'rental', 'real estate'] },
  { key: 'business',       label: 'Business & Commerce',      keywords: ['business license', 'corporation', 'limited liability', 'partnership', 'commerce', 'occupational'] },
  { key: 'agriculture',    label: 'Agriculture',              keywords: ['agriculture', 'farm', 'cattle', 'crop', 'pesticide', 'livestock'] },
  { key: 'veterans',       label: 'Veterans & Military',      keywords: ['veteran', 'military', 'national guard', 'armed forces'] },
  { key: 'tech',           label: 'Technology & Privacy',     keywords: ['cybersecurity', 'data privacy', 'artificial intelligence', 'cryptocurrency', 'digital'] },
  { key: 'gaming',         label: 'Gaming & Sports Betting',  keywords: ['gaming', 'gambling', 'lottery', 'sports betting', 'casino'] },
  { key: 'judiciary',      label: 'Courts & Civil Law',       keywords: ['judicial', 'court', 'civil procedure', 'tort', 'damages', 'attorney', 'judgment'] },
  { key: 'local',          label: 'Local Government',         keywords: ['county', 'municipality', 'city council', 'local government', 'home rule'] },
  { key: 'public_health',  label: 'Public Health',            keywords: ['public health', 'communicable disease', 'mental health', 'substance abuse', 'addiction'] },
  { key: 'ceremonial',     label: 'Ceremonial / Memorial',    keywords: ['recognizing', 'commending', 'honoring', 'in memoriam', 'congratulating', 'observance', 'awareness month', 'awareness day'] },
  { key: 'state_govt',     label: 'State Government Ops',     keywords: ['executive branch', 'state agency', 'department of', 'commission', 'governor'] },
  { key: 'civil_rights',   label: 'Civil Rights & Liberties', keywords: ['discrimination', 'civil rights', 'religious freedom', 'free speech', 'protected class'] },
];

export default TAXONOMY;
