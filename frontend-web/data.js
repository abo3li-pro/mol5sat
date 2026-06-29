// ═══════════════════════════════════════════════════════
//  MOL5SAT — COUNTRIES, SUBJECTS & SEED DATA  v6
//  ✅ All world countries with school systems & grades
//  ✅ Rich mock summaries (30+) across grades & countries
//  ✅ Profile photo + banner editing support
//  ✅ No duplicate code, deployment-safe
// ═══════════════════════════════════════════════════════

var SUBJECTS = window.SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','Arabic','English','History','Geography','Computer Science','Statistics','Economics','Philosophy','French','German','Spanish','Art','Music','Physical Education','Islamic Studies','Social Studies'];

var SUBJECT_ICONS = window.SUBJECT_ICONS = {
  Physics:'⚛️',Chemistry:'🧪',Biology:'🌿',Mathematics:'📐',Arabic:'📖',
  English:'🔤',History:'🏛️',Geography:'🗺️','Computer Science':'💻',
  Statistics:'📊',Economics:'📈',Philosophy:'🤔',French:'🇫🇷',
  German:'🇩🇪',Spanish:'🇪🇸',Art:'🎨',Music:'🎵',
  'Physical Education':'🏃','Islamic Studies':'☪️','Social Studies':'🌐'
};

var ARABIC_COUNTRIES = window.ARABIC_COUNTRIES = [
  'Egypt','Saudi Arabia','United Arab Emirates','Jordan','Kuwait','Qatar',
  'Morocco','Tunisia','Algeria','Sudan','Yemen','Syria','Libya','Lebanon',
  'Iraq','Oman','Palestine','Bahrain','Mauritania','Somalia','Djibouti','Comoros'
];

// ══════════════════════════════════════════════════════════════
//  COUNTRIES — All world nations with proper school systems
// ══════════════════════════════════════════════════════════════
var COUNTRIES = window.COUNTRIES = {

  // ── MIDDLE EAST & NORTH AFRICA ──────────────────────────────
  'Egypt': {
    schoolTypes: ['حكومي (Government)','لغات (Language School)','دولي (International)','أزهري (Azhari)','خاص (Private)','تعليم منزلي (Homeschool)'],
    grades: ['الصف الأول الابتدائي','الصف الثاني الابتدائي','الصف الثالث الابتدائي','الصف الرابع الابتدائي','الصف الخامس الابتدائي','الصف السادس الابتدائي','الصف الأول الإعدادي','الصف الثاني الإعدادي','الصف الثالث الإعدادي','الصف الأول الثانوي','الصف الثاني الثانوي','الصف الثالث الثانوي (الثانوية العامة)','University']
  },
  'Saudi Arabia': {
    schoolTypes: ['حكومي','أهلي','دولي','تحفيظ قرآن'],
    grades: ['الصف الأول الابتدائي','الصف الثاني الابتدائي','الصف الثالث الابتدائي','الصف الرابع الابتدائي','الصف الخامس الابتدائي','الصف السادس الابتدائي','الصف الأول المتوسط','الصف الثاني المتوسط','الصف الثالث المتوسط','الصف الأول الثانوي','الصف الثاني الثانوي','الصف الثالث الثانوي','University']
  },
  'United Arab Emirates': {
    schoolTypes: ['Government (MOE)','Private','International (ADEK/KHDA)','Free Zone School'],
    grades: ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12','University']
  },
  'Jordan': {
    schoolTypes: ['حكومي','خاص','دولي','أونروا (UNRWA)'],
    grades: ['الصف الأول','الصف الثاني','الصف الثالث','الصف الرابع','الصف الخامس','الصف السادس','الصف السابع','الصف الثامن','الصف التاسع','الصف العاشر','الصف الحادي عشر','الصف الثاني عشر','University']
  },
  'Kuwait': {
    schoolTypes: ['حكومي','خاص','دولي','تطبيقي'],
    grades: ['الصف الأول الابتدائي','الصف الثاني الابتدائي','الصف الثالث الابتدائي','الصف الرابع الابتدائي','الصف الخامس الابتدائي','الصف السادس الابتدائي','الصف الأول المتوسط','الصف الثاني المتوسط','الصف الثالث المتوسط','الصف الأول الثانوي','الصف الثاني الثانوي','الصف الثالث الثانوي','University']
  },
  'Qatar': {
    schoolTypes: ['Government','Private','International (QF)','Independent School'],
    grades: ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12','University']
  },
  'Bahrain': {
    schoolTypes: ['Government','Private','International'],
    grades: ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12','University']
  },
  'Oman': {
    schoolTypes: ['حكومي','خاص','دولي'],
    grades: ['الصف الأول','الصف الثاني','الصف الثالث','الصف الرابع','الصف الخامس','الصف السادس','الصف السابع','الصف الثامن','الصف التاسع','الصف العاشر','الصف الحادي عشر','الصف الثاني عشر','University']
  },
  'Lebanon': {
    schoolTypes: ['رسمي (Public)','خاص (Private)','رهباني (Religious)','دولي'],
    grades: ['الأول ابتدائي','الثاني ابتدائي','الثالث ابتدائي','الرابع ابتدائي','الخامس ابتدائي','السادس ابتدائي','السابع ابتدائي','الثامن ابتدائي','الأول ثانوي','الثاني ثانوي','الثالث ثانوي','الباكالوريا','University']
  },
  'Iraq': {
    schoolTypes: ['حكومي','خاص','كوردي','دولي'],
    grades: ['الصف الأول','الصف الثاني','الصف الثالث','الصف الرابع','الصف الخامس','الصف السادس','الصف السابع','الصف الثامن','الصف التاسع','الصف العاشر','الصف الحادي عشر','الصف الثاني عشر','University']
  },
  'Syria': {
    schoolTypes: ['حكومي','خاص'],
    grades: ['الصف الأول','الصف الثاني','الصف الثالث','الصف الرابع','الصف الخامس','الصف السادس','الصف السابع','الصف الثامن','الصف التاسع','الصف العاشر','الصف الحادي عشر','الصف الثاني عشر','University']
  },
  'Palestine': {
    schoolTypes: ['أونروا (UNRWA)','حكومي','خاص'],
    grades: ['الصف الأول','الصف الثاني','الصف الثالث','الصف الرابع','الصف الخامس','الصف السادس','الصف السابع','الصف الثامن','الصف التاسع','الصف العاشر','الصف الحادي عشر','الصف الثاني عشر','University']
  },
  'Yemen': {
    schoolTypes: ['حكومي','خاص','ديني'],
    grades: ['الصف الأول','الصف الثاني','الصف الثالث','الصف الرابع','الصف الخامس','الصف السادس','الصف السابع','الصف الثامن','الصف التاسع','الصف العاشر','الصف الحادي عشر','الصف الثاني عشر','University']
  },
  'Libya': {
    schoolTypes: ['حكومي','خاص'],
    grades: ['الصف الأول','الصف الثاني','الصف الثالث','الصف الرابع','الصف الخامس','الصف السادس','الصف السابع','الصف الثامن','الصف التاسع','الصف العاشر','الصف الحادي عشر','الصف الثاني عشر','University']
  },
  'Sudan': {
    schoolTypes: ['حكومي','خاص','خليجي'],
    grades: ['الأول ابتدائي','الثاني ابتدائي','الثالث ابتدائي','الرابع ابتدائي','الخامس ابتدائي','السادس ابتدائي','السابع ابتدائي','الثامن ابتدائي','الأول ثانوي','الثاني ثانوي','الثالث ثانوي','University']
  },

  // ── NORTH AFRICA ─────────────────────────────────────────────
  'Morocco': {
    schoolTypes: ['Public (وزارة التربية)','Private (خاص)','Mission Française','International'],
    grades: ['1ère AP','2ème AP','3ème AP','4ème AP','5ème AP','6ème AP','1ère Collège','2ème Collège','3ème Collège','Tronc Commun','1ère Bac','2ème Bac','University']
  },
  'Tunisia': {
    schoolTypes: ['Public','Privé','École Pilote'],
    grades: ['1ère','2ème','3ème','4ème','5ème','6ème','7ème','8ème','9ème','1ère Sec','2ème Sec','3ème Sec','4ème Sec (Bac)','University']
  },
  'Algeria': {
    schoolTypes: ['Public','Privé','École Coranique'],
    grades: ['1ère AP','2ème AP','3ème AP','4ème AP','5ème AP','1AM','2AM','3AM','4AM','1AS','2AS','3AS (BAC)','University']
  },

  // ── SUB-SAHARAN AFRICA ────────────────────────────────────────
  'Nigeria': {
    schoolTypes: ['Federal Government College','State School','Private School','Islamic School'],
    grades: ['Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6','JSS 1','JSS 2','JSS 3','SSS 1','SSS 2','SSS 3 (WAEC)','University']
  },
  'Kenya': {
    schoolTypes: ['Public Primary','Public Secondary','Private','National School'],
    grades: ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12 (KCSE)','University']
  },
  'Ghana': {
    schoolTypes: ['Public','Private','International'],
    grades: ['Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6','JHS 1','JHS 2','JHS 3','SHS 1','SHS 2','SHS 3 (WASSCE)','University']
  },
  'South Africa': {
    schoolTypes: ['Public School','Private School','Model C','International'],
    grades: ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12 (Matric)','University']
  },
  'Ethiopia': {
    schoolTypes: ['Government','Private','Religious'],
    grades: ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10 (ESLCE)','Grade 11','Grade 12 (University Entrance)','University']
  },
  'Tanzania': {
    schoolTypes: ['Government','Private','International'],
    grades: ['Standard 1','Standard 2','Standard 3','Standard 4','Standard 5','Standard 6','Standard 7','Form 1','Form 2','Form 3','Form 4 (CSEE)','Form 5','Form 6 (ACSEE)','University']
  },
  'Uganda': {
    schoolTypes: ['Government','Private','International'],
    grades: ['Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6','Primary 7','Senior 1','Senior 2','Senior 3','Senior 4 (UCE)','Senior 5','Senior 6 (UACE)','University']
  },
  'Senegal': {
    schoolTypes: ['Public','Privé','Médersas'],
    grades: ['CI','CP','CE1','CE2','CM1','CM2','6ème','5ème','4ème','3ème','Seconde','Première','Terminale (Bac)','University']
  },
  'Cameroon': {
    schoolTypes: ['Public','Private (Anglophone)','Private (Francophone)','Mission School'],
    grades: ['Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Form 1','Form 2','Form 3','Form 4','Form 5 (O-Level)','Lower Sixth','Upper Sixth (A-Level)','University']
  },
  "Côte d'Ivoire": {
    schoolTypes: ['Public','Privé','International'],
    grades: ['CI','CP','CE1','CE2','CM1','CM2','6ème','5ème','4ème','3ème','Seconde','Première','Terminale','University']
  },
  'Zimbabwe': {
    schoolTypes: ['Government','Mission','Private','International'],
    grades: ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Form 1','Form 2','Form 3','Form 4 (ZIMSEC)','Lower 6','Upper 6','University']
  },
  'Zambia': {
    schoolTypes: ['Government','Mission','Private'],
    grades: ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12 (ECZ)','University']
  },
  'Mozambique': {
    schoolTypes: ['Public','Private'],
    grades: ['1ª Classe','2ª Classe','3ª Classe','4ª Classe','5ª Classe','6ª Classe','7ª Classe','8ª Classe','9ª Classe','10ª Classe','11ª Classe','12ª Classe','University']
  },
  'Rwanda': {
    schoolTypes: ['Public','Private','International'],
    grades: ['Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6','Senior 1','Senior 2','Senior 3','Senior 4','Senior 5','Senior 6 (A-Level)','University']
  },
  'Somalia': {
    schoolTypes: ['حكومي','خاص','ديني'],
    grades: ['الصف الأول','الصف الثاني','الصف الثالث','الصف الرابع','الصف الخامس','الصف السادس','الصف السابع','الصف الثامن','الصف التاسع','الصف العاشر','الصف الحادي عشر','الصف الثاني عشر','University']
  },
  'Mauritania': {
    schoolTypes: ['حكومي','خاص','محظرة (دينية)'],
    grades: ['الأول ابتدائي','الثاني ابتدائي','الثالث ابتدائي','الرابع ابتدائي','الخامس ابتدائي','السادس ابتدائي','الأول إعدادي','الثاني إعدادي','الثالث إعدادي','الأول ثانوي','الثاني ثانوي','الثالث ثانوي','University']
  },

  // ── EUROPE ───────────────────────────────────────────────────
  'United Kingdom': {
    schoolTypes: ['State School (Academy)','Grammar School','Independent School','Free School','Homeschool'],
    grades: ['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6','Year 7','Year 8','Year 9','Year 10 (GCSE)','Year 11 (GCSE)','Year 12 (A-Level)','Year 13 (A-Level)','University']
  },
  'France': {
    schoolTypes: ['Public','Privé sous contrat','Lycée International','Homeschool'],
    grades: ['CP','CE1','CE2','CM1','CM2','6ème','5ème','4ème','3ème','Seconde','Première','Terminale','University']
  },
  'Germany': {
    schoolTypes: ['Gymnasium','Realschule','Hauptschule','Gesamtschule','Waldorf'],
    grades: ['Klasse 1','Klasse 2','Klasse 3','Klasse 4','Klasse 5','Klasse 6','Klasse 7','Klasse 8','Klasse 9','Klasse 10','Klasse 11','Klasse 12','Klasse 13 (Abitur)','University']
  },
  'Italy': {
    schoolTypes: ['Scuola Pubblica','Scuola Privata','Scuola Internazionale'],
    grades: ['1ª Elementare','2ª Elementare','3ª Elementare','4ª Elementare','5ª Elementare','1ª Media','2ª Media','3ª Media','1° Liceo','2° Liceo','3° Liceo','4° Liceo','5° Liceo (Maturità)','University']
  },
  'Spain': {
    schoolTypes: ['Pública','Concertada','Privada','Internacional'],
    grades: ['1° Primaria','2° Primaria','3° Primaria','4° Primaria','5° Primaria','6° Primaria','1° ESO','2° ESO','3° ESO','4° ESO','1° Bachillerato','2° Bachillerato (PAU)','University']
  },
  'Portugal': {
    schoolTypes: ['Pública','Privada','Internacional'],
    grades: ['1º Ano','2º Ano','3º Ano','4º Ano','5º Ano','6º Ano','7º Ano','8º Ano','9º Ano','10º Ano','11º Ano','12º Ano (Exame Nacional)','University']
  },
  'Netherlands': {
    schoolTypes: ['Openbaar','Bijzonder','International'],
    grades: ['Groep 1','Groep 2','Groep 3','Groep 4','Groep 5','Groep 6','Groep 7','Groep 8','Brugklas','VMBO 2','VMBO 3','VMBO 4 / HAVO 4','HAVO 5 / VWO 6','University']
  },
  'Belgium': {
    schoolTypes: ['Communal (FR)','Libre (FR)','Gemeentelijk (NL)','Vrij (NL)','International'],
    grades: ['1ère P','2ème P','3ème P','4ème P','5ème P','6ème P','1ère S','2ème S','3ème S','4ème S','5ème S','6ème S (TFE/BAC)','University']
  },
  'Switzerland': {
    schoolTypes: ['Kantonsschule','Gymnasium','Privatschule','International (IB)'],
    grades: ['1. Klasse','2. Klasse','3. Klasse','4. Klasse','5. Klasse','6. Klasse','7. Klasse / Sek I','8. Klasse','9. Klasse','Gymnasialstufe 1','Gymnasialstufe 2','Gymnasialstufe 3','Matura','University']
  },
  'Austria': {
    schoolTypes: ['AHS','BHS','NMS','Privatschule'],
    grades: ['1. Klasse VS','2. Klasse VS','3. Klasse VS','4. Klasse VS','1. Klasse MS','2. Klasse MS','3. Klasse MS','4. Klasse MS','5. Klasse AHS','6. Klasse AHS','7. Klasse AHS','8. Klasse AHS (Matura)','University']
  },
  'Sweden': {
    schoolTypes: ['Kommunal skola','Friskola','International'],
    grades: ['Åk 1','Åk 2','Åk 3','Åk 4','Åk 5','Åk 6','Åk 7','Åk 8','Åk 9','Gymnasiet år 1','Gymnasiet år 2','Gymnasiet år 3 (Studentexamen)','University']
  },
  'Norway': {
    schoolTypes: ['Kommunal','Privat','International'],
    grades: ['1. trinn','2. trinn','3. trinn','4. trinn','5. trinn','6. trinn','7. trinn','8. trinn','9. trinn','10. trinn','Vg1','Vg2','Vg3 (Vitnemål)','University']
  },
  'Denmark': {
    schoolTypes: ['Folkeskole','Friskole','Privatskole','International'],
    grades: ['0. klasse','1. klasse','2. klasse','3. klasse','4. klasse','5. klasse','6. klasse','7. klasse','8. klasse','9. klasse','10. klasse','STX/HF 1','STX/HF 2 (Studentereksamen)','University']
  },
  'Finland': {
    schoolTypes: ['Peruskoulu','Yksityinen','International'],
    grades: ['1. luokka','2. luokka','3. luokka','4. luokka','5. luokka','6. luokka','7. luokka','8. luokka','9. luokka','Lukio 1','Lukio 2','Lukio 3 (Ylioppilastutkinto)','University']
  },
  'Poland': {
    schoolTypes: ['Publiczna','Prywatna','Katolicka'],
    grades: ['Klasa 1 SP','Klasa 2 SP','Klasa 3 SP','Klasa 4 SP','Klasa 5 SP','Klasa 6 SP','Klasa 7 SP','Klasa 8 SP (Egzamin)','Liceum 1','Liceum 2','Liceum 3','Liceum 4 (Matura)','University']
  },
  'Czech Republic': {
    schoolTypes: ['Základní škola','Gymnázium','Střední škola','Soukromá'],
    grades: ['1. třída','2. třída','3. třída','4. třída','5. třída','6. třída','7. třída','8. třída','9. třída','1. ročník SŠ','2. ročník SŠ','3. ročník SŠ','4. ročník SŠ (Maturita)','University']
  },
  'Greece': {
    schoolTypes: ['Δημόσιο','Ιδιωτικό','Πρότυπο','Διεθνές'],
    grades: ['Α΄ Δημ.','Β΄ Δημ.','Γ΄ Δημ.','Δ΄ Δημ.','Ε΄ Δημ.','ΣΤ΄ Δημ.','Α΄ Γυμν.','Β΄ Γυμν.','Γ΄ Γυμν.','Α΄ Λυκ.','Β΄ Λυκ.','Γ΄ Λυκ. (Πανελλήνιες)','University']
  },
  'Romania': {
    schoolTypes: ['Şcoală de Stat','Şcoală Privată','Colegiu Naţional'],
    grades: ['Clasa 1','Clasa 2','Clasa 3','Clasa 4','Clasa 5','Clasa 6','Clasa 7','Clasa 8 (Evaluare Naţională)','Clasa 9','Clasa 10','Clasa 11','Clasa 12 (Bacalaureat)','University']
  },
  'Hungary': {
    schoolTypes: ['Állami iskola','Magániskola','Egyházi iskola','Gimnázium'],
    grades: ['1. osztály','2. osztály','3. osztály','4. osztály','5. osztály','6. osztály','7. osztály','8. osztály','9. osztály','10. osztály','11. osztály','12. osztály (Érettségi)','University']
  },
  'Russia': {
    schoolTypes: ['Государственная','Частная','Гимназия','Лицей'],
    grades: ['1 класс','2 класс','3 класс','4 класс','5 класс','6 класс','7 класс','8 класс','9 класс (ОГЭ)','10 класс','11 класс (ЕГЭ)','University']
  },
  'Ukraine': {
    schoolTypes: ['Державна','Приватна','Ліцей','Гімназія'],
    grades: ['1 клас','2 клас','3 клас','4 клас','5 клас','6 клас','7 клас','8 клас','9 клас','10 клас','11 клас (ЗНО/НМТ)','University']
  },
  'Turkey': {
    schoolTypes: ['Devlet Okulu','Özel Okul','Anadolu Lisesi','Fen Lisesi','İmam Hatip'],
    grades: ['1. Sınıf','2. Sınıf','3. Sınıf','4. Sınıf','5. Sınıf','6. Sınıf','7. Sınıf','8. Sınıf (LGS)','9. Sınıf','10. Sınıf','11. Sınıf','12. Sınıf (YKS)','University']
  },

  // ── NORTH AMERICA ────────────────────────────────────────────
  'United States': {
    schoolTypes: ['Public School','Private School','Charter School','Magnet School','Homeschool'],
    grades: ['Kindergarten','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9 (Freshman)','Grade 10 (Sophomore)','Grade 11 (Junior)','Grade 12 (Senior)','University']
  },
  'Canada': {
    schoolTypes: ['Public School','Catholic School','Private School','École Française','Homeschool'],
    grades: ['Kindergarten','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12','University']
  },
  'Mexico': {
    schoolTypes: ['Pública (SEP)','Privada','CONALEP','Telebachillerato','Bachillerato Internacional'],
    grades: ['1° Primaria','2° Primaria','3° Primaria','4° Primaria','5° Primaria','6° Primaria','1° Secundaria','2° Secundaria','3° Secundaria','1° Bachillerato','2° Bachillerato','3° Bachillerato','University']
  },
  'Guatemala': {
    schoolTypes: ['Pública','Privada','Cooperativa'],
    grades: ['Primero Primaria','Segundo Primaria','Tercero Primaria','Cuarto Primaria','Quinto Primaria','Sexto Primaria','Primero Básico','Segundo Básico','Tercero Básico','Cuarto Bachillerato','Quinto Bachillerato','Sexto Bachillerato','University']
  },
  'Cuba': {
    schoolTypes: ['Estatal'],
    grades: ['1er Grado','2do Grado','3er Grado','4to Grado','5to Grado','6to Grado','7mo Grado','8vo Grado','9no Grado','10mo Grado','11mo Grado','12mo Grado','University']
  },

  // ── SOUTH AMERICA ────────────────────────────────────────────
  'Brazil': {
    schoolTypes: ['Escola Pública','Escola Privada','Escola Federal','Sistema COC/Anglo'],
    grades: ['1º Ano EF','2º Ano EF','3º Ano EF','4º Ano EF','5º Ano EF','6º Ano EF','7º Ano EF','8º Ano EF','9º Ano EF','1ª Série EM','2ª Série EM','3ª Série EM (ENEM)','University']
  },
  'Argentina': {
    schoolTypes: ['Pública','Privada','Bilingüe'],
    grades: ['1° Primaria','2° Primaria','3° Primaria','4° Primaria','5° Primaria','6° Primaria','7° Primaria','1° Secundaria','2° Secundaria','3° Secundaria','4° Secundaria','5° Secundaria','6° Secundaria','University']
  },
  'Colombia': {
    schoolTypes: ['Oficial','Privada','Internacional'],
    grades: ['1° Primaria','2° Primaria','3° Primaria','4° Primaria','5° Primaria','6° Secundaria','7° Secundaria','8° Secundaria','9° Secundaria','10° Media','11° Media (ICFES)','University']
  },
  'Chile': {
    schoolTypes: ['Municipal','Particular Subvencionado','Particular Pagado'],
    grades: ['1° Básico','2° Básico','3° Básico','4° Básico','5° Básico','6° Básico','7° Básico','8° Básico','1° Medio','2° Medio','3° Medio','4° Medio (PSU/PAES)','University']
  },
  'Peru': {
    schoolTypes: ['Pública','Privada','Parroquial'],
    grades: ['1° Primaria','2° Primaria','3° Primaria','4° Primaria','5° Primaria','6° Primaria','1° Secundaria','2° Secundaria','3° Secundaria','4° Secundaria','5° Secundaria','University']
  },
  'Venezuela': {
    schoolTypes: ['Nacional','Privada'],
    grades: ['1° Grado','2° Grado','3° Grado','4° Grado','5° Grado','6° Grado','1er Año','2do Año','3er Año','4to Año','5to Año','University']
  },
  'Bolivia': {
    schoolTypes: ['Fiscal','Privada'],
    grades: ['1° Primaria','2° Primaria','3° Primaria','4° Primaria','5° Primaria','6° Primaria','1° Secundaria','2° Secundaria','3° Secundaria','4° Secundaria','5° Secundaria','6° Secundaria (Bachiller)','University']
  },
  'Ecuador': {
    schoolTypes: ['Pública','Particular','Fiscomisional'],
    grades: ['1° EGB','2° EGB','3° EGB','4° EGB','5° EGB','6° EGB','7° EGB','8° EGB','9° EGB','10° EGB','1° BGU','2° BGU','3° BGU (ENES)','University']
  },

  // ── ASIA ─────────────────────────────────────────────────────
  'India': {
    schoolTypes: ['Government','Private (CBSE)','Private (ICSE)','State Board','International (IB)','Kendriya Vidyalaya'],
    grades: ['Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10 (CBSE Board)','Class 11','Class 12 (JEE/NEET)','University']
  },
  'Pakistan': {
    schoolTypes: ['Government','Private (Cambridge)','Madrassa','Army Public School'],
    grades: ['Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10 (Matric)','Class 11 (FSc)','Class 12 (FSc)','University']
  },
  'Bangladesh': {
    schoolTypes: ['Government','Private','Madrassa','English Medium'],
    grades: ['Class 1','Class 2','Class 3','Class 4','Class 5 (PSC)','Class 6','Class 7','Class 8','Class 9','Class 10 (SSC)','Class 11','Class 12 (HSC)','University']
  },
  'Sri Lanka': {
    schoolTypes: ['National School','Provincial School','Private','International'],
    grades: ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5 (Scholarship)','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11 (O/L)','Grade 12','Grade 13 (A/L)','University']
  },
  'Nepal': {
    schoolTypes: ['Government','Private (Boarding)','Private (Day)'],
    grades: ['Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10 (SEE)','Class 11','Class 12 (NEB)','University']
  },
  'China': {
    schoolTypes: ['公立 (Public)','私立 (Private)','国际 (International)','实验学校 (Model School)'],
    grades: ['一年级','二年级','三年级','四年级','五年级','六年级','初一','初二','初三 (中考)','高一','高二','高三 (高考/Gaokao)','University']
  },
  'Japan': {
    schoolTypes: ['公立 (Kōritsu)','私立 (Shiritsu)','国立 (Kokuritsu)','インターナショナル'],
    grades: ['小1','小2','小3','小4','小5','小6','中1','中2','中3 (高校受験)','高1','高2','高3 (大学入試)','University']
  },
  'South Korea': {
    schoolTypes: ['공립 (Public)','사립 (Private)','외국어고 (Foreign Language)','과학고 (Science)'],
    grades: ['초1','초2','초3','초4','초5','초6','중1','중2','중3 (고입)','고1','고2','고3 (수능/CSAT)','University']
  },
  'Vietnam': {
    schoolTypes: ['Trường Công Lập','Trường Tư Thục','Trường Quốc Tế','Trường Chuyên'],
    grades: ['Lớp 1','Lớp 2','Lớp 3','Lớp 4','Lớp 5','Lớp 6','Lớp 7','Lớp 8','Lớp 9 (THCS)','Lớp 10','Lớp 11','Lớp 12 (THPTQG)','University']
  },
  'Thailand': {
    schoolTypes: ['โรงเรียนรัฐบาล (Public)','โรงเรียนเอกชน (Private)','โรงเรียนนานาชาติ (International)'],
    grades: ['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3 (O-NET)','ม.4','ม.5','ม.6 (GAT/PAT)','University']
  },
  'Indonesia': {
    schoolTypes: ['Sekolah Negeri','Sekolah Swasta','Madrasah','Pesantren','Sekolah Internasional'],
    grades: ['Kelas 1 SD','Kelas 2 SD','Kelas 3 SD','Kelas 4 SD','Kelas 5 SD','Kelas 6 SD (UN)','Kelas 7 SMP','Kelas 8 SMP','Kelas 9 SMP (UN)','Kelas 10 SMA','Kelas 11 SMA','Kelas 12 SMA (UTBK)','University']
  },
  'Malaysia': {
    schoolTypes: ['Sekolah Kebangsaan','Sekolah Jenis Kebangsaan','Sekolah Swasta','Sekolah Antarabangsa'],
    grades: ['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6 (UPSR)','Form 1','Form 2','Form 3 (PT3)','Form 4','Form 5 (SPM)','Form 6 Lower','Form 6 Upper (STPM)','University']
  },
  'Philippines': {
    schoolTypes: ['Public','Private','Catholic','International','Madrasah'],
    grades: ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10 (Junior High)','Grade 11 (Senior High)','Grade 12 (UPCET/ACET)','University']
  },
  'Singapore': {
    schoolTypes: ['Government','Government-Aided','Independent','International'],
    grades: ['Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6 (PSLE)','Secondary 1','Secondary 2','Secondary 3','Secondary 4 (O-Level)','Secondary 5','JC 1','JC 2 (A-Level)','University']
  },
  'Myanmar': {
    schoolTypes: ['State','Private','Monastic'],
    grades: ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11 (Matriculation)','University']
  },
  'Cambodia': {
    schoolTypes: ['Public','Private'],
    grades: ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12 (Baccalaureate)','University']
  },
  'Afghanistan': {
    schoolTypes: ['حکومتی','خصوصی','مدرسه'],
    grades: ['صنف اول','صنف دوم','صنف سوم','صنف چهارم','صنف پنجم','صنف ششم','صنف هفتم','صنف هشتم','صنف نهم','صنف دهم','صنف یازدهم','صنف دوازدهم (بکالوریا)','University']
  },
  'Iran': {
    schoolTypes: ['دولتی','خصوصی','نمونه دولتی','تیزهوشان'],
    grades: ['اول دبستان','دوم دبستان','سوم دبستان','چهارم دبستان','پنجم دبستان','ششم دبستان (امتحان)','هفتم متوسطه','هشتم متوسطه','نهم متوسطه (امتحان)','دهم دبیرستان','یازدهم دبیرستان','دوازدهم دبیرستان (کنکور)','University']
  },
  'Kazakhstan': {
    schoolTypes: ['Мемлекеттік (State)','Жеке меншік (Private)','Назарбаев зияткерлік мектебі'],
    grades: ['1 сынып','2 сынып','3 сынып','4 сынып','5 сынып','6 сынып','7 сынып','8 сынып','9 сынып (ОГЭ)','10 сынып','11 сынып (ЕНТ)','University']
  },
  'Uzbekistan': {
    schoolTypes: ["Davlat maktabi","Xususiy maktab","Ixtisoslashtirilgan maktab"],
    grades: ['1-sinf','2-sinf','3-sinf','4-sinf','5-sinf','6-sinf','7-sinf','8-sinf','9-sinf','10-sinf','11-sinf (DTM)','University']
  },
  'Azerbaijan': {
    schoolTypes: ['Dövlət məktəbi','Özəl məktəb','Beynəlxalq məktəb'],
    grades: ['1-ci sinif','2-ci sinif','3-cü sinif','4-cü sinif','5-ci sinif','6-cı sinif','7-ci sinif','8-ci sinif','9-cu sinif','10-cu sinif','11-ci sinif (Buraxılış)','University']
  },
  'Georgia': {
    schoolTypes: ['საჯარო (Public)','კერძო (Private)'],
    grades: ['I კლასი','II კლასი','III კლასი','IV კლასი','V კლასი','VI კლასი','VII კლასი','VIII კლასი','IX კლასი','X კლასი','XI კლასი','XII კლასი (ერთიანი გამოცდა)','University']
  },

  // ── SOUTH & SOUTHEAST ASIA ───────────────────────────────────
  // ── OCEANIA ──────────────────────────────────────────────────
  'Australia': {
    schoolTypes: ['Government','Catholic','Independent','Home School'],
    grades: ['Prep/Kindergarten','Year 1','Year 2','Year 3','Year 4','Year 5','Year 6','Year 7','Year 8','Year 9','Year 10','Year 11','Year 12 (HSC/VCE/WACE)','University']
  },
  'New Zealand': {
    schoolTypes: ['State School','State Integrated','Private','Kura Kaupapa Māori'],
    grades: ['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6','Year 7','Year 8','Year 9','Year 10','Year 11 (NCEA L1)','Year 12 (NCEA L2)','Year 13 (NCEA L3)','University']
  },

  // ── SPECIAL / INTERNATIONAL ──────────────────────────────────
  'International (IB / No Fixed Country)': {
    schoolTypes: ['IB World School','Cambridge International (CAIE)','American Curriculum','Pearson / Edexcel','Other International'],
    grades: ['PYP Year 1','PYP Year 2','PYP Year 3','PYP Year 4','PYP Year 5','MYP Year 1','MYP Year 2','MYP Year 3','MYP Year 4','MYP Year 5','DP Year 1','DP Year 2','University']
  },
  'Other': {
    schoolTypes: ['Public','Private','International','Religious','Homeschool','Other'],
    grades: ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12','University']
  }
};

var ALL_COUNTRIES = window.ALL_COUNTRIES = Object.keys(COUNTRIES);

// ══════════════════════════════════════════════════════════════
//  COLLEGE CATEGORIES PER COUNTRY
// ══════════════════════════════════════════════════════════════
var COUNTRY_COLLEGE_CATEGORIES = window.COUNTRY_COLLEGE_CATEGORIES = {
  'Egypt': ['Medical & Health Sciences','Dentistry','Pharmacy','Engineering & Technology','Computer Science & IT','Natural Sciences','Business & Economics','Law & Political Science','Humanities & Social Sciences','Arts & Design','Media & Communication','Education','Agriculture & Environment','Languages & Literature','Religion & Theology','Tourism & Hospitality','Veterinary Medicine','Fine Arts','Physical Education','Other'],
  'Saudi Arabia': ['Medical & Health Sciences','Dentistry','Pharmacy','Engineering & Technology','Computer Science & IT','Natural Sciences','Business & Economics','Islamic Studies & Sharia','Law','Humanities & Social Sciences','Education','Agriculture & Environment','Languages & Literature','Architecture','Other'],
  'United Arab Emirates': ['Medical & Health Sciences','Engineering & Technology','Computer Science & IT','Business & Economics','Law','Humanities & Social Sciences','Arts & Design','Media & Communication','Tourism & Hospitality','Languages & Literature','Education','Architecture','Other'],
  'United States': ['Medicine (MD)','Dentistry','Pharmacy','Nursing','Engineering & Technology','Computer Science','Natural Sciences','Business (MBA/BBA)','Law (JD)','Humanities','Social Sciences','Arts & Design','Media & Communication','Education','Agriculture','Languages','Other'],
  'United Kingdom': ['Medicine (MBBS)','Dentistry','Pharmacy','Nursing','Engineering & Technology','Computer Science','Natural Sciences','Business & Economics','Law (LLB)','Humanities','Social Sciences','Arts & Design','Media & Communication','Education','Languages','Architecture','Other'],
  'France': ['Médecine','Pharmacie','Droit','Ingénierie','Informatique','Sciences','Économie & Gestion','Lettres & Sciences Humaines','Arts','Architecture','Éducation','Langues','IUT (Technologie)','Sciences Politiques','Other'],
  'Germany': ['Medizin','Zahnmedizin','Pharmazie','Ingenieurwesen','Informatik','Naturwissenschaften','Wirtschaft','Jura','Geisteswissenschaften','Sozialwissenschaften','Pädagogik','Architektur','Kunst','Sprachen','Other'],
  'India': ['MBBS / Medicine','Dentistry','Pharmacy','Nursing','B.Tech / Engineering','Computer Science (BCA/MCA)','Natural Sciences','B.Com / MBA','LLB / Law','Humanities','Education (B.Ed)','Architecture','Agriculture','Fine Arts','Other'],
  'Pakistan': ['MBBS / Medicine','BDS / Dentistry','Pharm-D','Engineering','Computer Science','Natural Sciences','Business (BBA/MBA)','LLB / Law','Humanities','Education (B.Ed)','Agriculture','Architecture','Other'],
  'China': ['医学 (Medicine)','工程 (Engineering)','计算机科学 (CS)','法学 (Law)','经济学 (Economics)','文学 (Literature)','理学 (Sciences)','教育学 (Education)','建筑学 (Architecture)','艺术 (Arts)','Other'],
  'Japan': ['医学 (Medicine)','工学 (Engineering)','情報工学 (CS)','法学 (Law)','経済学 (Economics)','文学 (Literature)','理学 (Sciences)','教育学 (Education)','建築学 (Architecture)','芸術 (Arts)','Other'],
  'South Korea': ['의학 (Medicine)','공학 (Engineering)','컴퓨터공학 (CS)','법학 (Law)','경제학 (Economics)','인문학 (Humanities)','자연과학 (Sciences)','교육학 (Education)','건축학 (Architecture)','예술 (Arts)','Other'],
  'Turkey': ['Tıp','Diş Hekimliği','Eczacılık','Mühendislik','Bilgisayar Bilimleri','Hukuk','Ekonomi','İşletme','Eğitim','Fen Bilimleri','Mimarlık','Güzel Sanatlar','Other'],
  'Brazil': ['Medicina','Odontologia','Farmácia','Engenharia','Ciência da Computação','Ciências','Direito','Administração','Humanidades','Educação','Arquitetura','Artes','Other'],
  'Indonesia': ['Kedokteran','Teknik','Ilmu Komputer','Hukum','Ekonomi','Ilmu Sosial','FKIP (Pendidikan)','Pertanian','Arsitektur','Seni','Other'],
  'Nigeria': ['Medicine & Surgery','Dentistry','Pharmacy','Engineering','Computer Science','Natural Sciences','Business Administration','Law','Humanities','Education','Agriculture','Architecture','Other'],
  'Russia': ['Медицина','Стоматология','Фармация','Инженерия','Информатика','Естественные науки','Право','Экономика','Гуманитарные науки','Педагогика','Архитектура','Искусство','Other'],
  'Australia': ['Medicine','Dentistry','Pharmacy','Nursing','Engineering','Computer Science','Natural Sciences','Business','Law','Humanities','Education','Architecture','Agriculture','Arts','Other'],
  'Canada': ['Medicine (MD)','Dentistry','Pharmacy','Nursing','Engineering','Computer Science','Natural Sciences','Business (MBA)','Law (JD)','Humanities','Social Sciences','Education','Architecture','Agriculture','Arts','Other'],
  'Spain': ['Medicina','Farmacia','Ingeniería','Informática','Derecho','Ciencias Económicas','Humanidades','Ciencias','Arquitectura','Educación','Arte & Diseño','Lenguas','Turismo','Other'],
  'Morocco': ['Médecine','Pharmacie','Ingénierie','Informatique','Droit','Sciences Économiques','Lettres','Sciences','Architecture','Éducation','Tourisme','Langues','Journalisme','Other'],
  'Tunisia': ['Médecine','Pharmacie','Ingénierie','Informatique','Droit','Économie','Lettres','Sciences','Architecture','Éducation','Langues','Journalisme','Other'],
  'Algeria': ['Médecine','Pharmacie','Ingénierie','Informatique','Droit','Économie','Lettres','Sciences','Architecture','Éducation','Langues','Other'],
  'Malaysia': ['Medicine','Dentistry','Pharmacy','Nursing','Engineering','Computer Science','Natural Sciences','Business','Law','Humanities','Education','Architecture','Agriculture','Other'],
  'Philippines': ['Medicine','Nursing','Engineering','Computer Science','Education','Business Administration','Law','Architecture','Arts & Sciences','Agriculture','Other'],
  'Singapore': ['Medicine','Dentistry','Engineering','Computing','Law','Business','Humanities & Social Sciences','Sciences','Architecture','Education','Other'],
  'Vietnam': ['Y khoa (Medicine)','Kỹ thuật (Engineering)','CNTT (IT)','Luật (Law)','Kinh tế (Economics)','Sư phạm (Education)','Khoa học (Sciences)','Kiến trúc (Architecture)','Nghệ thuật (Arts)','Other'],
  'Thailand': ['แพทยศาสตร์ (Medicine)','วิศวกรรมศาสตร์ (Engineering)','วิทยาการคอมพิวเตอร์ (CS)','นิติศาสตร์ (Law)','บริหารธุรกิจ (Business)','ครุศาสตร์ (Education)','วิทยาศาสตร์ (Sciences)','สถาปัตยกรรม (Architecture)','ศิลปกรรม (Arts)','Other'],
  'Kenya': ['Medicine','Nursing','Engineering','Computer Science','Business Administration','Law','Education','Agriculture','Humanities','Architecture','Other'],
  'South Africa': ['MBChB (Medicine)','Engineering','Computer Science','Law (LLB)','Commerce (BCom)','Education','Agriculture','Humanities','Architecture','Social Work','Other'],
  'Jordan': ['Medical & Health Sciences','Engineering & Technology','Computer Science & IT','Natural Sciences','Business & Economics','Law & Political Science','Humanities & Social Sciences','Education','Languages & Literature','Architecture','Agriculture','Media & Communication','Islamic Studies','Other'],
  'Kuwait': ['Medical & Health Sciences','Engineering & Technology','Computer Science & IT','Petroleum Engineering','Business & Economics','Islamic Studies & Sharia','Law','Humanities & Social Sciences','Education','Architecture','Other'],
  'Qatar': ['Medical & Health Sciences','Engineering & Technology','Computer Science & IT','Business & Economics','Islamic Studies & Sharia','Law','International Affairs','Humanities & Social Sciences','Education','Media & Communication','Architecture','Other'],
  'Bahrain': ['Medical & Health Sciences','Engineering & Technology','Computer Science & IT','Business & Economics','Islamic Studies & Sharia','Law','Humanities & Social Sciences','Education','Architecture','Tourism & Hospitality','Other'],
  'Oman': ['Medical & Health Sciences','Engineering & Technology','Computer Science & IT','Petroleum Engineering','Business & Economics','Islamic Studies & Sharia','Law','Humanities & Social Sciences','Education','Agriculture','Architecture','Other'],
  'Lebanon': ['Medical & Health Sciences','Dentistry','Pharmacy','Engineering & Technology','Computer Science & IT','Business & Economics','Law & Political Science','Humanities & Social Sciences','Media & Communication','Fine Arts','Architecture','Education','Hotel Management','Other'],
  'Iraq': ['Medical & Health Sciences','Dentistry','Pharmacy','Engineering & Technology','Computer Science & IT','Petroleum Engineering','Natural Sciences','Business & Economics','Law','Islamic Studies & Sharia','Humanities & Social Sciences','Education','Agriculture','Architecture','Other'],
  'Syria': ['Medical & Health Sciences','Dentistry','Pharmacy','Engineering & Technology','Computer Science & IT','Natural Sciences','Business & Economics','Law','Islamic Studies & Sharia','Humanities & Social Sciences','Education','Agriculture','Architecture','Fine Arts','Other'],
  'Palestine': ['Medical & Health Sciences','Engineering & Technology','Computer Science & IT','Natural Sciences','Business & Economics','Law & Political Science','Islamic Studies & Sharia','Humanities & Social Sciences','Education','Agriculture','Media & Communication','Other'],
  'Yemen': ['Medical & Health Sciences','Engineering & Technology','Computer Science & IT','Natural Sciences','Business & Economics','Law','Islamic Studies & Sharia','Humanities & Social Sciences','Education','Agriculture','Other'],
  'Libya': ['Medical & Health Sciences','Engineering & Technology','Computer Science & IT','Petroleum Engineering','Natural Sciences','Business & Economics','Law','Islamic Studies & Sharia','Humanities & Social Sciences','Education','Agriculture','Other'],
  'Sudan': ['Medical & Health Sciences','Dentistry','Pharmacy','Engineering & Technology','Computer Science & IT','Natural Sciences','Business & Economics','Law','Islamic Studies & Sharia','Humanities & Social Sciences','Education','Agriculture','Veterinary Medicine','Other'],
  'Iran': ['پزشکی (Medicine)','مهندسی (Engineering)','کامپیوتر (CS)','حقوق (Law)','اقتصاد (Economics)','ادبیات (Literature)','علوم (Sciences)','معماری (Architecture)','هنر (Arts)','تربیت معلم (Education)','Other'],
  'Poland': ['Medycyna','Prawo','Inżynieria','Informatyka','Ekonomia','Humanistyka','Nauki Ścisłe','Pedagogika','Architektura','Sztuka','Other'],
  'Italy': ['Medicina','Ingegneria','Informatica','Giurisprudenza','Economia','Lettere','Scienze','Architettura','Arte','Scienze della Formazione','Other'],
  'Greece': ['Ιατρική','Μηχανική','Πληροφορική','Νομική','Οικονομικά','Ανθρωπιστικές','Θετικές Επιστήμες','Παιδαγωγική','Αρχιτεκτονική','Καλές Τέχνες','Other'],

  // ── Sub-Saharan Africa (Anglophone, Commonwealth-pattern universities) ──
  'Ghana': ['Medicine & Health Sciences','Pharmacy','Engineering','Computer Science & IT','Natural Sciences','Business & Administration','Law','Agriculture','Humanities & Social Sciences','Education','Architecture','Theology','Other'],
  'Ethiopia': ['Medicine & Health Sciences','Engineering & Technology','Computer Science & IT','Natural Sciences','Business & Economics','Law','Agriculture & Veterinary Medicine','Humanities & Social Sciences','Education','Architecture','Other'],
  'Tanzania': ['Medicine & Health Sciences','Engineering','Computer Science & IT','Natural Sciences','Business & Commerce','Law','Agriculture','Humanities & Social Sciences','Education','Architecture','Other'],
  'Uganda': ['Medicine & Health Sciences','Engineering','Computer Science & IT','Natural Sciences','Business Administration','Law','Agriculture & Veterinary Medicine','Humanities & Social Sciences','Education','Architecture','Other'],
  'Senegal': ['Médecine','Pharmacie','Ingénierie','Informatique','Droit','Sciences Économiques','Lettres & Sciences Humaines','Sciences','Agronomie','Éducation','Architecture','Other'],
  'Cameroon': ['Médecine','Pharmacie','Ingénierie','Informatique','Droit','Sciences Économiques','Lettres & Sciences Humaines','Sciences','Agronomie','Éducation','Other'],
  "Côte d'Ivoire": ['Médecine','Pharmacie','Ingénierie','Informatique','Droit','Sciences Économiques','Lettres & Sciences Humaines','Sciences','Agronomie','Éducation','Other'],
  'Zimbabwe': ['Medicine & Health Sciences','Engineering','Computer Science & IT','Natural Sciences','Business & Commerce','Law','Agriculture & Veterinary Science','Humanities & Social Sciences','Education','Architecture','Other'],
  'Zambia': ['Medicine & Health Sciences','Engineering','Computer Science & IT','Natural Sciences','Business & Economics','Law','Agriculture & Veterinary Medicine','Humanities & Social Sciences','Education','Mining Engineering','Other'],
  'Mozambique': ['Medicina','Farmácia','Engenharia','Informática','Direito','Economia & Gestão','Letras & Ciências Humanas','Ciências','Agronomia','Educação','Other'],
  'Rwanda': ['Medicine & Health Sciences','Engineering','Computer Science & IT','Natural Sciences','Business & Economics','Law','Agriculture & Veterinary Medicine','Humanities & Social Sciences','Education','Architecture','Other'],
  'Somalia': ['Medicine & Health Sciences','Engineering','Computer Science & IT','Natural Sciences','Business & Economics','Law','Islamic Studies & Sharia','Humanities & Social Sciences','Education','Agriculture','Other'],
  'Mauritania': ['Médecine','Pharmacie','Ingénierie','Informatique','Droit','Sciences Économiques','Études Islamiques','Lettres & Sciences Humaines','Sciences','Éducation','Other'],

  // ── Western & Northern Europe ─────────────────────────────────
  'Portugal': ['Medicina','Medicina Dentária','Farmácia','Engenharia','Informática','Direito','Economia & Gestão','Letras & Humanidades','Ciências','Arquitetura','Belas-Artes','Educação','Veterinária','Turismo','Other'],
  'Netherlands': ['Geneeskunde','Tandheelkunde','Farmacie','Technische Wetenschappen','Informatica','Rechten','Economie & Bedrijfskunde','Letteren & Geesteswetenschappen','Natuurwetenschappen','Bouwkunde','Kunst & Ontwerp','Onderwijs','Other'],
  'Belgium': ['Médecine / Geneeskunde','Pharmacie / Farmacie','Ingénierie / Ingenieurswetenschappen','Informatique / Informatica','Droit / Rechten','Économie / Economie','Lettres / Letteren','Sciences / Wetenschappen','Architecture / Architectuur','Éducation / Onderwijs','Other'],
  'Switzerland': ['Medizin / Médecine','Pharmazie','Ingenieurwissenschaften','Informatik','Recht / Droit','Wirtschaftswissenschaften','Geisteswissenschaften','Naturwissenschaften','Architektur','Kunst & Design','Pädagogik','Hotelmanagement','Other'],
  'Austria': ['Medizin','Pharmazie','Ingenieurwesen','Informatik','Rechtswissenschaften','Wirtschaftswissenschaften','Geisteswissenschaften','Naturwissenschaften','Architektur','Kunst','Lehramt (Pädagogik)','Other'],
  'Sweden': ['Medicin','Farmaci','Teknik','Datavetenskap','Juridik','Ekonomi','Humaniora','Naturvetenskap','Arkitektur','Konst & Design','Lärarutbildning','Other'],
  'Norway': ['Medisin','Farmasi','Ingeniørfag','Informatikk','Juridikum','Økonomi','Humanistiske Fag','Naturvitenskap','Arkitektur','Kunst & Design','Lærerutdanning','Other'],
  'Denmark': ['Medicin','Farmaci','Ingeniørvidenskab','Datalogi','Jura','Økonomi','Humaniora','Naturvidenskab','Arkitektur','Kunst & Design','Læreruddannelse','Other'],
  'Finland': ['Lääketiede','Farmasia','Tekniikka','Tietojenkäsittelytiede','Oikeustiede','Kauppatiede','Humanistiset Tieteet','Luonnontieteet','Arkkitehtuuri','Taide & Muotoilu','Kasvatustiede','Other'],

  // ── Central & Eastern Europe ──────────────────────────────────
  'Czech Republic': ['Medicína','Farmacie','Inženýrství','Informatika','Právo','Ekonomie','Humanitní Vědy','Přírodní Vědy','Architektura','Umění','Pedagogika','Other'],
  'Romania': ['Medicină','Farmacie','Inginerie','Informatică','Drept','Economie','Științe Umaniste','Științe Naturale','Arhitectură','Arte','Pedagogie','Other'],
  'Hungary': ['Orvostudomány','Gyógyszerészet','Műszaki Tudományok','Informatika','Jogtudomány','Gazdaságtudomány','Bölcsészettudomány','Természettudomány','Építészet','Művészet','Pedagógia','Other'],
  'Ukraine': ['Медицина','Фармація','Інженерія','Інформатика','Право','Економіка','Гуманітарні Науки','Природничі Науки','Архітектура','Мистецтво','Педагогіка','Other'],

  // ── Latin America (Spanish/Portuguese, Licenciatura system) ─────
  'Mexico': ['Medicina','Odontología','Farmacia','Ingeniería','Informática','Derecho','Administración y Negocios','Economía','Humanidades','Ciencias','Arquitectura','Artes','Educación','Agronomía','Other'],
  'Guatemala': ['Medicina','Odontología','Farmacia','Ingeniería','Informática','Derecho','Administración de Empresas','Economía','Humanidades','Ciencias','Arquitectura','Educación','Agronomía','Other'],
  'Cuba': ['Medicina','Estomatología','Farmacia','Ingeniería','Informática','Derecho','Economía','Humanidades','Ciencias','Arquitectura','Pedagogía','Agronomía','Other'],
  'Argentina': ['Medicina','Odontología','Farmacia','Ingeniería','Informática','Derecho','Ciencias Económicas','Humanidades','Ciencias Exactas y Naturales','Arquitectura','Artes','Ciencias de la Educación','Agronomía','Veterinaria','Other'],
  'Colombia': ['Medicina','Odontología','Farmacia','Ingeniería','Informática','Derecho','Administración y Negocios','Economía','Humanidades','Ciencias','Arquitectura','Artes','Licenciatura en Educación','Agronomía','Other'],
  'Chile': ['Medicina','Odontología','Farmacia','Ingeniería','Informática','Derecho','Administración y Negocios','Economía','Humanidades','Ciencias','Arquitectura','Pedagogía','Agronomía','Veterinaria','Other'],
  'Peru': ['Medicina','Odontología','Farmacia','Ingeniería','Informática','Derecho','Administración y Negocios','Economía','Humanidades','Ciencias','Arquitectura','Educación','Agronomía','Other'],
  'Venezuela': ['Medicina','Odontología','Farmacia','Ingeniería','Informática','Derecho','Administración y Contaduría','Economía','Humanidades','Ciencias','Arquitectura','Educación','Agronomía','Other'],
  'Bolivia': ['Medicina','Odontología','Farmacia','Ingeniería','Informática','Derecho','Administración de Empresas','Economía','Humanidades','Ciencias','Arquitectura','Educación','Agronomía','Other'],
  'Ecuador': ['Medicina','Odontología','Farmacia','Ingeniería','Informática','Derecho','Administración de Empresas','Economía','Humanidades','Ciencias','Arquitectura','Educación','Agronomía','Other'],

  // ── South Asia (Commonwealth-pattern, Honours system) ──────────
  'Bangladesh': ['Medicine (MBBS)','Dentistry (BDS)','Pharmacy','Engineering','Computer Science & IT','Law (LLB)','Business Studies','Economics','Arts & Humanities','Social Science','Natural Sciences','Agriculture','Education','Islamic Studies','Other'],
  'Sri Lanka': ['Medicine (MBBS)','Dentistry','Pharmacy','Engineering','Computer Science & IT','Law','Management & Commerce','Humanities & Social Sciences','Natural Sciences','Architecture','Agriculture','Education','Other'],
  'Nepal': ['Medicine (MBBS)','Dentistry','Pharmacy','Engineering','Computer Science & IT','Law (LLB)','Management','Humanities & Social Sciences','Natural Sciences','Agriculture & Veterinary Science','Education','Other'],

  // ── Southeast Asia ───────────────────────────────────────────
  'Myanmar': ['Medicine','Dentistry','Pharmacy','Engineering','Computer Science','Law','Economics & Commerce','Arts & Humanities','Natural Sciences','Agriculture','Education','Other'],
  'Cambodia': ['Medicine','Dentistry','Pharmacy','Engineering','Information Technology','Law','Business & Economics','Humanities & Social Sciences','Natural Sciences','Agriculture','Education','Other'],

  // ── Central Asia (Soviet-legacy faculty structure) ────────────
  'Afghanistan': ['Medicine','Pharmacy','Engineering','Computer Science','Law','Economics','Islamic Studies & Sharia','Humanities & Social Sciences','Natural Sciences','Agriculture','Education','Other'],
  'Kazakhstan': ['Медицина','Фармация','Инженерия','Информатика','Құқықтану','Экономика','Гуманитарлық ғылымдар','Жаратылыстану ғылымдары','Педагогика','Ауыл шаруашылығы','Архитектура','Other'],
  'Uzbekistan': ['Медицина','Фармация','Инженерия','Информатика','Право','Экономика','Гуманитарные науки','Естественные науки','Педагогика','Сельское хозяйство','Архитектура','Other'],
  'Azerbaijan': ['Tibb','Əczaçılıq','Mühəndislik','İnformatika','Hüquq','İqtisadiyyat','Humanitar elmlər','Təbiət elmləri','Pedaqogika','Memarlıq','Other'],
  'Georgia': ['მედიცინა','ფარმაცია','ინჟინერია','ინფორმატიკა','სამართალი','ეკონომიკა','ჰუმანიტარული მეცნიერებები','საბუნებისმეტყველო მეცნიერებები','პედაგოგიკა','არქიტექტურა','Other'],

  // ── Oceania ────────────────────────────────────────────────────
  'New Zealand': ['Medicine (MBChB)','Dentistry','Pharmacy','Engineering','Computer Science','Law (LLB)','Business & Commerce','Humanities','Social Sciences','Natural Sciences','Architecture','Agriculture','Education','Veterinary Science','Other'],

  // ── Special / catch-all entries ──────────────────────────────
  'International (IB / No Fixed Country)': ['Medicine','Engineering','Computer Science','Law','Business & Economics','Humanities','Natural Sciences','Architecture','Arts & Design','Education','Liberal Arts','Other'],
  'Other': ['Medicine','Engineering','Computer Science & IT','Natural Sciences','Business & Economics','Law','Humanities & Social Sciences','Education','Other'],

  'DEFAULT': ['Medical & Health Sciences','Engineering & Technology','Computer Science & IT','Natural Sciences','Business & Economics','Law & Political Science','Humanities & Social Sciences','Education','Other']
};

function getCollegeCategoriesForCountry(c) {
  return COUNTRY_COLLEGE_CATEGORIES[c] || COUNTRY_COLLEGE_CATEGORIES['DEFAULT'];
}

function getLangPreference(country) {
  if (ARABIC_COUNTRIES.includes(country)) return ['ar','en','fr'];
  const langMap = {
    'France':'fr','Belgium':'fr',
    "Côte d'Ivoire":'fr','Senegal':'fr','Cameroon':'fr',
    'Germany':'de','Austria':'de','Switzerland':'de',
    'Spain':'es','Mexico':'es','Colombia':'es','Argentina':'es','Chile':'es','Peru':'es','Venezuela':'es','Bolivia':'es','Ecuador':'es','Cuba':'es','Guatemala':'es',
    'Brazil':'pt','Portugal':'pt','Mozambique':'pt',
    'Russia':'ru','Ukraine':'ru','Kazakhstan':'ru','Uzbekistan':'ru','Azerbaijan':'az','Georgia':'ka',
    'China':'zh','Japan':'ja','South Korea':'ko',
    'Vietnam':'vi','Thailand':'th','Indonesia':'id','Malaysia':'ms',
    'India':'hi','Pakistan':'ur','Bangladesh':'bn','Nepal':'ne','Sri Lanka':'si',
    'Turkey':'tr','Iran':'fa','Afghanistan':'fa',
    'Poland':'pl','Czech Republic':'cs','Romania':'ro','Hungary':'hu','Greece':'el',
    'Italy':'it','Netherlands':'nl','Sweden':'sv','Norway':'no','Denmark':'da','Finland':'fi',
    'Philippines':'fil','Myanmar':'my','Cambodia':'km',
    'Nigeria':'en','Kenya':'sw','Ghana':'en','South Africa':'en','Tanzania':'sw','Uganda':'sw',
    'Rwanda':'rw','Zambia':'en','Zimbabwe':'en','Ethiopia':'am',
    'Singapore':'en','Australia':'en','New Zealand':'en','Canada':'en',
  };
  const lang = langMap[country];
  if (lang) {
    if (['zh','ja','ko','vi','th','id','ms','tr','fa','pl','cs','ro','hu','el','it','nl','sv','no','da','fi','fil','my','km','am','rw','sw','pt','hi','ur','bn','ne','si','az','ka','de','es','fr','ru','uk'].includes(lang)) {
      return [lang, 'en', 'ar'];
    }
  }
  return ['en','ar','fr'];
}

var SUBJECT_BRANCHES = window.SUBJECT_BRANCHES = {
  'arabic': ['arabic','نحو','صرف','بلاغة','أدب','قراءة','إملاء','تعبير','لغة عربية','نصوص','قواعد','عربي'],
  'عربي': ['arabic','نحو','صرف','بلاغة','أدب','قراءة','لغة عربية','نصوص','قواعد'],
  'نحو': ['نحو','arabic','قواعد','عربي'],'صرف': ['صرف','arabic','عربي'],
  'بلاغة': ['بلاغة','arabic','أدب','عربي'],'أدب': ['أدب','arabic','بلاغة'],
  'قواعد': ['قواعد','نحو','arabic'],'نصوص': ['نصوص','arabic','أدب'],
  'math': ['math','mathematics','algebra','calculus','geometry','statistics','trigonometry','جبر','هندسة','تفاضل','تكامل','حساب','رياضيات'],
  'mathematics': ['math','mathematics','algebra','calculus','geometry','رياضيات','جبر','تفاضل','تكامل'],
  'رياضيات': ['math','mathematics','algebra','calculus','رياضيات','جبر','هندسة','تفاضل','تكامل'],
  'جبر': ['algebra','math','جبر','رياضيات'],'تفاضل': ['calculus','تفاضل','تكامل','رياضيات'],
  'physics': ['physics','mechanics','thermodynamics','quantum','electricity','optics','waves','فيزياء','ميكانيكا','كهرباء','بصريات','موجات'],
  'فيزياء': ['physics','mechanics','electricity','فيزياء','ميكانيكا','كهرباء','بصريات'],
  'ميكانيكا': ['mechanics','physics','ميكانيكا'],'كهرباء': ['electricity','physics','كهرباء'],
  'chemistry': ['chemistry','organic','inorganic','biochemistry','كيمياء','عضوية','غير عضوية'],
  'كيمياء': ['chemistry','organic','كيمياء','عضوية'],'عضوية': ['organic','chemistry','عضوية'],
  'biology': ['biology','genetics','cells','anatomy','ecology','أحياء','بيولوجيا','وراثة','خلايا','تشريح'],
  'أحياء': ['biology','genetics','cells','أحياء','وراثة','خلايا'],
  'english': ['english','literature','grammar','writing','reading','إنجليزي','لغة إنجليزية'],
  'history': ['history','تاريخ'],'تاريخ': ['history','تاريخ'],
  'geography': ['geography','جغرافيا'],'جغرافيا': ['geography','جغرافيا'],
  'computer': ['computer science','programming','coding','software','برمجة','حاسب'],
  'برمجة': ['programming','computer science','برمجة','حاسب'],
  'علوم': ['science','physics','chemistry','biology','علوم'],
  'statistics': ['statistics','probability','إحصاء'],'إحصاء': ['statistics','probability','إحصاء'],
  'economics': ['economics','اقتصاد'],'اقتصاد': ['economics','اقتصاد'],
  'philosophy': ['philosophy','فلسفة'],'فلسفة': ['philosophy','فلسفة','منطق'],
  'french': ['french','français','فرنسية'],'français': ['french','français'],
  'german': ['german','deutsch','ألمانية'],'spanish': ['spanish','español','إسبانية'],
  'islamic': ['islamic studies','islamic','دين','تربية إسلامية','فقه','عقيدة'],
  'دين': ['islamic studies','دين','فقه','عقيدة'],
  'art': ['art','fine arts','painting','drawing','sculpture','design','فنون','رسم','تصميم','فن'],
  'فنون': ['art','fine arts','painting','drawing','فنون','رسم','فن'],
  'music': ['music','musical','singing','instrument','موسيقى','غناء','عزف'],
  'موسيقى': ['music','musical','موسيقى','غناء'],
  'physical education': ['physical education','sports','gym','fitness','pe','رياضة','تربية رياضية','جمباز'],
  'رياضة': ['physical education','sports','رياضة','تربية رياضية'],
  'social studies': ['social studies','society','citizenship','civics','اجتماعيات','مجتمع','تربية وطنية'],
  'اجتماعيات': ['social studies','society','اجتماعيات','مجتمع'],
};

function expandQuery(q) {
  const lower = q.toLowerCase().trim();
  const direct = SUBJECT_BRANCHES[lower] || [];
  const partial = [];
  Object.keys(SUBJECT_BRANCHES).forEach(k => {
    if (k.includes(lower) || lower.includes(k)) partial.push(...(SUBJECT_BRANCHES[k] || []));
  });
  return [...new Set([lower, ...direct, ...partial])];
}

// ══════════════════════════════════════════════════════════════
//  MOCK COMPANIES (advertisers)
// ══════════════════════════════════════════════════════════════
var MOCK_COMPANIES = window.MOCK_COMPANIES = [
  {id:'c1',name:'Edraak',logo:'🎓',category:'Education Tech',cpm:4.2,desc:'Leading Arab e-learning platform'},
  {id:'c2',name:'Noon Academy',logo:'📚',category:'EdTech',cpm:3.8,desc:'Social learning platform for MENA'},
  {id:'c3',name:'Alef Education',logo:'🔤',category:'Education',cpm:5.1,desc:'Personalised K-12 learning'},
  {id:'c4',name:'Majid Al Futtaim',logo:'🛍️',category:'Retail',cpm:6.3,desc:'Leading MENA retail & leisure'},
  {id:'c5',name:'Vodafone Egypt',logo:'📱',category:'Telecom',cpm:7.9,desc:'Egypt\'s leading telecom'},
  {id:'c6',name:'Careem',logo:'🚗',category:'Transport',cpm:5.5,desc:'MENA ride-hailing super-app'},
  {id:'c7',name:'Khan Academy',logo:'🌐',category:'Education',cpm:3.2,desc:'Free world-class education'},
  {id:'c8',name:'Amazon',logo:'📦',category:'E-Commerce',cpm:8.1,desc:'Largest global e-commerce'},
  {id:'c9',name:'Jabra',logo:'🎧',category:'Electronics',cpm:6.7,desc:'Professional audio solutions'},
  {id:'c10',name:'Orange Egypt',logo:'🟠',category:'Telecom',cpm:7.2,desc:'Global telecom in Egypt'},
  {id:'c11',name:'Casio',logo:'⌚',category:'Electronics',cpm:4.9,desc:'Iconic calculators & watches'},
  {id:'c12',name:'Stabilo',logo:'✏️',category:'Stationery',cpm:3.5,desc:'Europe\'s top stationery brand'},
  {id:'c13',name:'Coursera',logo:'🎯',category:'EdTech',cpm:5.8,desc:'Online university courses'},
  {id:'c14',name:'Duolingo',logo:'🦜',category:'Education',cpm:4.4,desc:'World\'s top language app'},
  {id:'c15',name:'Microsoft',logo:'🪟',category:'Technology',cpm:9.2,desc:'Global technology leader'},
  {id:'c16',name:'Samsung',logo:'📺',category:'Electronics',cpm:7.6,desc:'Global electronics innovator'},
  {id:'c17',name:'Pepsi',logo:'🥤',category:'Beverages',cpm:6.1,desc:'Global beverage brand'},
  {id:'c18',name:'Lenovo',logo:'💻',category:'Electronics',cpm:5.5,desc:'Global PC & laptop brand'},
];

// ══════════════════════════════════════════════════════════════
//  MOCK USERS  (with avatar + banner photo support)
// ══════════════════════════════════════════════════════════════
var MOCK_USERS = window.MOCK_USERS = [
  {
    id:'u1',username:'admin',name:'Admin',email:'admin@mol5sat.org',password:'admin123',role:'admin',userType:'admin',
    country:'Egypt',joined:'2024-01-01',status:'active',uploads:0,followers:0,following:[],interests:[],
    notifications:[],hasMembership:false,membershipPrice:0,membershipPerks:'',
    avatar:null, bannerColor:'linear-gradient(135deg,var(--surf3),var(--surf4))'
  },
  {
    id:'u2',username:'ahmed_elsayed',name:'أحمد السيد',email:'ahmed@example.com',password:'ahmed123',role:'creator',userType:'student',
    country:'Egypt',school:'حكومي (Government)',grade:'الصف الثاني الثانوي',joined:'2024-06-12',
    status:'active',uploads:8,followers:4200,following:['u4','u6'],interests:['Physics','Mathematics'],
    notifications:[{id:'n1',text:'منى طاهر رفعت ملخص جديد: كيمياء الصف الأول',time:'2h ago',read:false,summaryId:'m16'}],
    hasMembership:false,membershipPrice:0,membershipPerks:'',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(255,184,0,.2),rgba(232,93,4,.15))'
  },
  {
    id:'u3',username:'sara_k',name:'Sara K.',email:'sara@example.com',password:'sara123',role:'creator',userType:'student',
    country:'International (IB / No Fixed Country)',school:'IB World School',grade:'DP Year 1',
    joined:'2024-08-03',status:'active',uploads:3,followers:1800,following:['u7'],
    interests:['Mathematics','Computer Science'],notifications:[],hasMembership:false,membershipPrice:0,membershipPerks:'',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(100,200,255,.18),rgba(50,100,200,.12))'
  },
  {
    id:'u4',username:'mona_taher',name:'منى طاهر',email:'mona@example.com',password:'mona123',role:'creator',userType:'student',
    country:'Egypt',school:'حكومي (Government)',grade:'الصف الثالث الثانوي (الثانوية العامة)',
    joined:'2024-05-20',status:'active',uploads:12,followers:7100,following:[],
    interests:['Chemistry','Biology'],
    notifications:[
      {id:'n5',text:'نور الدين بدأ في متابعتك!',time:'5h ago',read:false,summaryId:'',actorId:'u8'},
      {id:'n6',text:'👑 أحمد السيد اشترك في عضويتك!',time:'2d ago',read:true,summaryId:'',actorId:'u2'}
    ],
    hasMembership:true,membershipPrice:29,membershipPerks:'• ملخصات حصرية قبل النشر العام\n• جلسات مراجعة أونلاين شهرية\n• اسأل المذاكرة: ردود مضمونة خلال 24 ساعة\n• شارة المشترك المميز على ملفك',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(34,197,94,.15),rgba(16,185,129,.1))'
  },
  {
    id:'u5',username:'lim_wei',name:'Lim Wei',email:'lim@example.com',password:'lim123',role:'student',userType:'student',
    country:'Malaysia',school:'Sekolah Kebangsaan',grade:'Form 4',
    joined:'2024-10-01',status:'active',uploads:1,followers:230,following:[],
    interests:['Biology','Chemistry'],notifications:[],hasMembership:false,membershipPrice:0,membershipPerks:'',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(59,130,246,.15),rgba(37,99,235,.1))'
  },
  {
    id:'u6',username:'yousef_ghazali',name:'يوسف الغزالي',email:'yousef@example.com',password:'yousef123',role:'creator',userType:'student',
    country:'Egypt',school:'حكومي (Government)',grade:'الصف الثالث الإعدادي',
    joined:'2024-03-15',status:'active',uploads:22,followers:12000,following:['u2'],
    interests:['Arabic','History'],
    notifications:[{id:'n2',text:'أحمد السيد رفع ملخص: البلاغة الكاملة',time:'1d ago',read:true,summaryId:'m14'}],
    hasMembership:true,membershipPrice:49,membershipPerks:'• ملخصات ثالثة إعدادي كاملة قبل الامتحانات بأسبوعين\n• نماذج امتحانات محلولة حصرية\n• جروب واتساب مع المذاكرة\n• شارة "عضو يوسف" في كل التعليقات',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(245,158,11,.2),rgba(217,119,6,.12))'
  },
  {
    id:'u7',username:'dr_karim',name:'Dr. Karim N.',email:'karim@example.com',password:'karim123',role:'creator',userType:'colleague',
    country:'Egypt',specialization:'Computer Science & IT',major:'Software Engineering',
    joined:'2024-02-28',status:'active',uploads:6,followers:3400,following:[],
    interests:['Physics','Mathematics'],notifications:[],hasMembership:false,membershipPrice:0,membershipPerks:'',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(99,102,241,.18),rgba(79,70,229,.1))'
  },
  {
    id:'u8',username:'nour_eldin',name:'نور الدين',email:'nour@example.com',password:'nour123',role:'student',userType:'student',
    country:'Egypt',school:'حكومي (Government)',grade:'الصف الأول الثانوي',
    joined:'2024-09-01',status:'active',uploads:2,followers:890,following:['u2','u4','u6'],
    interests:['Mathematics','Physics'],
    notifications:[
      {id:'n3',text:'يوسف الغزالي رفع: ملخص النحو والصرف الكامل',time:'3d ago',read:false,summaryId:'m5'},
      {id:'n4',text:'منى طاهر رفعت: كيمياء الصف الأول مقدمة',time:'1d ago',read:false,summaryId:'m16'}
    ],
    hasMembership:false,membershipPrice:0,membershipPerks:'',
    avatar:null, bannerColor:'linear-gradient(135deg,var(--surf3),var(--surf4))'
  },
  {
    id:'u9',username:'alex_m',name:'Alex M.',email:'alex@example.com',password:'alex123',role:'creator',userType:'student',
    country:'United States',school:'Public School',grade:'Grade 12 (Senior)',
    joined:'2024-07-20',status:'banned',uploads:4,followers:640,following:[],
    interests:['Chemistry','Biology'],notifications:[],hasMembership:false,membershipPrice:0,membershipPerks:'',
    avatar:null, bannerColor:'linear-gradient(135deg,var(--surf3),var(--surf4))'
  },
  {
    id:'u10',username:'hana_mahmoud',name:'هنا محمود',email:'hana@example.com',password:'hana123',role:'creator',userType:'student',
    country:'Egypt',school:'لغات (Language School)',grade:'الصف الثاني الثانوي',
    joined:'2024-04-10',status:'active',uploads:9,followers:5300,following:[],
    interests:['Mathematics','Physics'],notifications:[],
    hasMembership:true,membershipPrice:19,membershipPerks:'• ملخصات لغات (Language School) حصرية\n• تمارين مع حلول كاملة\n• أكسس مبكر للملخصات قبل النشر\n• بدون إعلانات على كل ملخصاتي',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(236,72,153,.15),rgba(219,39,119,.1))'
  },
  {
    id:'u11',username:'james_o',name:'James O.',email:'james@example.com',password:'james123',role:'student',userType:'student',
    country:'United Kingdom',school:'State School (Academy)',grade:'Year 11 (GCSE)',
    joined:'2024-11-05',status:'active',uploads:1,followers:180,following:[],
    interests:['Statistics','Mathematics'],notifications:[],hasMembership:false,membershipPrice:0,membershipPerks:'',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(59,130,246,.15),rgba(29,78,216,.1))'
  },
  {
    id:'u12',username:'ali_hassan',name:'علي حسن',email:'ali@example.com',password:'ali123',role:'student',userType:'student',
    country:'Egypt',school:'حكومي (Government)',grade:'الصف الثالث الإعدادي',
    joined:'2025-01-08',status:'active',uploads:1,followers:120,following:[],
    interests:['Physics'],notifications:[],hasMembership:false,membershipPrice:0,membershipPerks:'',
    avatar:null, bannerColor:'linear-gradient(135deg,var(--surf3),var(--surf4))'
  },
  {
    id:'u13',username:'priya_s',name:'Priya S.',email:'priya@example.com',password:'priya123',role:'creator',userType:'student',
    country:'United Kingdom',school:'Grammar School',grade:'Year 13 (A-Level)',
    joined:'2024-09-14',status:'active',uploads:3,followers:440,following:[],
    interests:['Biology'],notifications:[],hasMembership:false,membershipPrice:0,membershipPerks:'',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(167,139,250,.18),rgba(139,92,246,.1))'
  },
  {
    id:'u14',username:'dr_omar',name:'د. عمر فاروق',email:'omar@example.com',password:'omar123',role:'creator',userType:'colleague',
    country:'Egypt',specialization:'Computer Science & IT',major:'Software Engineering',
    joined:'2024-12-01',status:'active',uploads:4,followers:2100,following:[],
    interests:['Computer Science'],notifications:[],hasMembership:false,membershipPrice:0,membershipPerks:'',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(20,184,166,.18),rgba(13,148,136,.1))'
  },
  {
    id:'u15',username:'fatima_z',name:'فاطمة الزهراء',email:'fatima@example.com',password:'fatima123',role:'creator',userType:'student',
    country:'Egypt',school:'حكومي (Government)',grade:'الصف الثالث الثانوي (الثانوية العامة)',
    joined:'2024-07-01',status:'active',uploads:15,followers:9200,following:['u4'],
    interests:['Biology','Chemistry','Arabic'],notifications:[],
    hasMembership:true,membershipPrice:39,membershipPerks:'• ملخصات ثانوية عامة شاملة (كل المواد)\n• ملفات PDF حصرية للمراجعة النهائية\n• حل نماذج وزارة كاملة\n• استشارات الامتحانات مجانًا',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(244,63,94,.15),rgba(225,29,72,.1))'
  },
  {
    id:'u16',username:'m_shareef',name:'محمد الشريف',email:'mshareef@example.com',password:'mshareef123',role:'creator',userType:'student',
    country:'Egypt',school:'لغات (Language School)',grade:'الصف الثالث الثانوي (الثانوية العامة)',
    joined:'2024-08-15',status:'active',uploads:7,followers:3800,following:[],
    interests:['Mathematics','Physics','Computer Science'],notifications:[],hasMembership:false,membershipPrice:0,membershipPerks:'',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(251,146,60,.18),rgba(234,88,12,.1))'
  },
  {
    id:'u17',username:'kofi_a',name:'Kofi Asante',email:'kofi@example.com',password:'kofi123',role:'creator',userType:'student',
    country:'Ghana',school:'Private','grade':'SHS 3 (WASSCE)',
    joined:'2025-01-15',status:'active',uploads:4,followers:920,following:[],
    interests:['Mathematics','Physics'],notifications:[],hasMembership:false,membershipPrice:0,membershipPerks:'',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(234,179,8,.2),rgba(161,98,7,.12))'
  },
  {
    id:'u18',username:'chen_li',name:'Chen Li',email:'chen@example.com',password:'chen123',role:'creator',userType:'student',
    country:'China',school:'公立 (Public)',grade:'高三 (高考/Gaokao)',
    joined:'2025-02-01',status:'active',uploads:6,followers:2400,following:[],
    interests:['Mathematics','Physics','Chemistry'],notifications:[],hasMembership:true,membershipPrice:15,membershipPerks:'• Exclusive Gaokao prep summaries\n• Monthly live sessions\n• Priority Q&A',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(239,68,68,.15),rgba(185,28,28,.1))'
  },
  {
    id:'u19',username:'ines_m',name:'Inès Moreau',email:'ines@example.com',password:'ines123',role:'creator',userType:'student',
    country:'France',school:'Public',grade:'Terminale',
    joined:'2025-01-20',status:'active',uploads:5,followers:1650,following:[],
    interests:['Mathematics','Philosophy','French'],notifications:[],hasMembership:false,membershipPrice:0,membershipPerks:'',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(59,130,246,.18),rgba(29,78,216,.12))'
  },
  {
    id:'u20',username:'chidi_n',name:'Chidi Nwosu',email:'chidi@example.com',password:'chidi123',role:'creator',userType:'student',
    country:'Nigeria',school:'Federal Government College',grade:'SSS 3 (WAEC)',
    joined:'2025-02-10',status:'active',uploads:8,followers:3100,following:[],
    interests:['Biology','Chemistry','Economics'],notifications:[],hasMembership:true,membershipPrice:10,membershipPerks:'• JAMB/WAEC prep bundles\n• Past questions solved\n• WhatsApp study group',
    avatar:null, bannerColor:'linear-gradient(135deg,rgba(34,197,94,.18),rgba(21,128,61,.12))'
  },
];

// ══════════════════════════════════════════════════════════════
//  SUMMARY CONTENT (rich multi-page content for key summaries)
// ══════════════════════════════════════════════════════════════
var SUMMARY_CONTENT = window.SUMMARY_CONTENT = {
  'm1': {
    pages: [
      `<h2>الفصل الأول: قوانين نيوتن للحركة</h2>
<p>الميكانيكا الكلاسيكية تدرس حركة الأجسام تحت تأثير القوى.</p>
<h3>1.1 قانون القصور الذاتي</h3>
<p>يبقى الجسم في حالة سكون أو حركة منتظمة ما لم تؤثر عليه قوة خارجية.</p>
<h3>1.2 القانون الثاني: F = ma</h3>
<p>القوة المحصلة = الكتلة × التسارع. الوحدة: النيوتن (N) = kg·m/s²</p>
<h3>1.3 القانون الثالث</h3>
<p>لكل فعل ردّ فعل مساوٍ ومعاكس. مثال: إطلاق الصاروخ.</p>`,
      `<h2>الفصل الثاني: الحركة في خط مستقيم</h2>
<h3>معادلات الكينماتيك</h3>
<ul>
<li><b>v = u + at</b></li><li><b>s = ut + ½at²</b></li><li><b>v² = u² + 2as</b></li>
</ul>
<h3>مثال محلول</h3>
<p>سيارة تبدأ من السكون بتسارع 4 m/s² — بعد 5 ثوانٍ: v = 20 m/s, s = 50 m</p>`,
      `<h2>الفصل الثالث: الجذب والاحتكاك</h2>
<h3>3.1 قانون الجذب الكوني</h3>
<p><b>F = G·m₁·m₂/r²</b> &nbsp;|&nbsp; G = 6.67×10⁻¹¹ N·m²/kg²</p>
<h3>3.2 الاحتكاك</h3>
<p>• احتكاك سكون: f_s ≤ μ_s·N &nbsp;|&nbsp; • احتكاك حركة: f_k = μ_k·N</p>`
    ]
  },
  'm2': {
    pages: [
      `<h2>Chapter 1: Limits & Derivatives</h2>
<h3>1.1 Limit Definition</h3>
<p>lim(x→a) f(x) = L — L'Hôpital's Rule: for 0/0 use lim f'/g'</p>
<h3>1.2 Derivative Rules</h3>
<ul><li><b>Power:</b> d/dx(xⁿ) = nxⁿ⁻¹</li><li><b>Chain:</b> [f(g(x))]' = f'(g(x))·g'(x)</li><li><b>Product:</b> (fg)' = f'g + fg'</li></ul>`,
      `<h2>Chapter 2: Integration</h2>
<h3>2.1 Key Integrals</h3>
<p>∫xⁿdx = xⁿ⁺¹/(n+1)+C &nbsp;|&nbsp; ∫eˣdx = eˣ+C &nbsp;|&nbsp; ∫sinx dx = -cosx+C</p>
<h3>2.2 Fundamental Theorem</h3>
<p>∫ₐᵇ f(x)dx = F(b) - F(a)</p>`
    ]
  },
  'm3': {
    pages: [
      `<h2>الفصل الأول: الهيدروكربونات</h2>
<p>• <b>ألكانات:</b> CₙH₂ₙ₊₂ (روابط مفردة) &nbsp;|&nbsp; • <b>ألكينات:</b> CₙH₂ₙ (رابطة مزدوجة)</p>
<p>• <b>ألكاينات:</b> CₙH₂ₙ₋₂ (رابطة ثلاثية)</p>
<h3>المجموعات الوظيفية</h3>
<p>-OH (كحول) | -COOH (حمض) | -CHO (ألدهيد) | C=O (كيتون) | -NH₂ (أمين)</p>`,
      `<h2>الفصل الثاني: التفاعلات العضوية</h2>
<h3>إضافة</h3><p>إيثيلين + H₂ → إيثان (بالحفاز Ni)</p>
<h3>إحلال</h3><p>CH₄ + Cl₂ → CH₃Cl + HCl (ضوء شمس)</p>
<h3>استريف</h3><p>حمض + كحول ⇌ إستر + ماء (H₂SO₄)</p>`
    ]
  },
  'm5': {
    pages: [
      `<h2>النحو: الجملة الاسمية</h2>
<p><b>المبتدأ:</b> اسم مرفوع في أول الجملة &nbsp;|&nbsp; <b>الخبر:</b> ما يتم به الفائدة</p>
<h3>أنواع الخبر</h3>
<ul><li>مفرد: العلمُ نافعٌ</li><li>جملة فعلية: الطالبُ يجتهدُ</li><li>شبه جملة: الكتابُ فوق المكتبِ</li></ul>`,
      `<h2>الصرف: الميزان الصرفي</h2>
<p>الأصل: فَعَلَ (ف ع ل)</p>
<h3>أوزان شائعة</h3>
<ul><li>فِعَالة: كِتابة، قِراءة</li><li>تَفْعِيل: تَدريس، تَكريم</li><li>فُعُول: دُخول، خُروج</li></ul>`
    ]
  },
  'm7': {
    pages: [
      `<h2>المعادلات التربيعية</h2>
<p><b>ax² + bx + c = 0</b></p>
<h3>طرق الحل</h3>
<p>• <b>القانون العام:</b> x = (-b ± √(b²-4ac)) / 2a</p>
<p>• <b>المميز Δ = b²-4ac:</b> Δ>0 حلان | Δ=0 حل واحد | Δ<0 لا حل حقيقي</p>`,
      `<h2>المتجهات</h2>
<p>v = (x, y) &nbsp;|&nbsp; |v| = √(x²+y²)</p>
<p>جمع: (a,b)+(c,d) = (a+c, b+d) &nbsp;|&nbsp; ضرب نقطي: v₁·v₂ = x₁x₂+y₁y₂</p>`
    ]
  },
  'm9': {
    pages: [
      `<h2>التفاضل</h2>
<p>dy/dx = lim(Δx→0) [f(x+Δx)-f(x)]/Δx</p>
<h3>قواعد أساسية</h3>
<ul><li>d/dx(xⁿ) = nxⁿ⁻¹</li><li>sin'x = cosx | cos'x = -sinx</li><li>(fg)' = f'g+fg'</li></ul>`,
      `<h2>التكامل</h2>
<p>∫xⁿdx = xⁿ⁺¹/(n+1)+C &nbsp;|&nbsp; ∫₀²(x²+1)dx = [x³/3+x]₀² = <b>14/3</b></p>`
    ]
  },
  'm11': {
    pages: [
      `<h2>الكهرباء الساكنة</h2>
<p><b>قانون كولوم:</b> F = k·q₁·q₂/r² &nbsp;|&nbsp; k = 9×10⁹ N·m²/C²</p>
<p><b>المجال:</b> E = F/q &nbsp;|&nbsp; <b>الجهد:</b> V = k·Q/r</p>`,
      `<h2>التيار والمقاومة</h2>
<p><b>قانون أوم:</b> V = IR &nbsp;|&nbsp; <b>توالي:</b> R_t = R₁+R₂ &nbsp;|&nbsp; <b>توازي:</b> 1/R_t = 1/R₁+1/R₂</p>
<p><b>القدرة:</b> P = VI = I²R = V²/R</p>`
    ]
  },
  'm13': {
    pages: [
      `<h2>Software Engineering Fundamentals</h2>
<h3>SDLC Phases</h3>
<p>Requirements → Design → Implementation → Testing → Deployment → Maintenance</p>
<h3>Agile vs Waterfall</h3>
<p>Waterfall: sequential, rigid. Agile: iterative sprints, flexible.</p>`,
      `<h2>Design Patterns & SOLID</h2>
<p><b>Singleton, Factory, MVC</b></p>
<p>S-ingle Responsibility | O-pen/Closed | L-iskov | I-nterface Segregation | D-ependency Inversion</p>`
    ]
  },
  'default': {
    pages: [
      `<h2>Chapter 1: Introduction</h2>
<p>This summary covers the essential material approved by the Mol5sat supervision team. All content is verified against the official curriculum.</p>
<h3>How to Use</h3>
<p>Read each section, cover and recall. Spaced repetition works best with this material.</p>`,
      `<h2>Chapter 2: Core Material</h2>
<p>All formulas and definitions verified against official textbooks and past exam papers.</p>
<h3>Practice Questions</h3>
<p>Test your understanding with the exercises. Compare with the model answers provided.</p>`
    ]
  }
};

// ══════════════════════════════════════════════════════════════
//  MOCK SUMMARIES — rich, diverse, global
// ══════════════════════════════════════════════════════════════
var MOCK_SUMMARIES = window.MOCK_SUMMARIES = [
  // ── Egypt · Government · Grade 11 ──────────────────────────
  {id:'m1',title:'ملخص الميكانيكا الكلاسيكية الكامل — الصف الثاني الثانوي',subject:'Physics',grade:'الصف الثاني الثانوي',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'أحمد السيد',authorId:'u2',views:14200,likes:1830,pages:24,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['physics','mechanics','فيزياء','ميكانيكا'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-03-10'},
  {id:'m7',title:'ملخص الجبر الكامل — المعادلات التربيعية والمتجهات',subject:'Mathematics',grade:'الصف الثاني الثانوي',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'أحمد السيد',authorId:'u2',views:18500,likes:2800,pages:22,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['math','algebra','رياضيات','جبر','متجهات'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-03-22'},
  {id:'m14',title:'ملخص البلاغة الكامل — الصور البيانية والأساليب',subject:'Arabic',grade:'الصف الثاني الثانوي',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'أحمد السيد',authorId:'u2',views:7800,likes:1100,pages:16,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['arabic','بلاغة','لغة عربية'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-08'},

  // ── Egypt · Language School · Grade 11 ────────────────────
  {id:'m9',title:'ملخص التفاضل والتكامل الشامل — لغات',subject:'Mathematics',grade:'الصف الثاني الثانوي',country:'Egypt',school:'لغات (Language School)',lang:'ar',author:'هنا محمود',authorId:'u10',views:12400,likes:1970,pages:20,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c5'],adEvery:6,tags:['calculus','رياضيات','تفاضل','تكامل'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-03-05'},
  {id:'m20',title:'Physics Revision — Electricity & Waves (Language School)',subject:'Physics',grade:'الصف الثاني الثانوي',country:'Egypt',school:'لغات (Language School)',lang:'en',author:'هنا محمود',authorId:'u10',views:9100,likes:1340,pages:18,isPaid:true,isPromoted:true,isSponsored:false,companyAds:['c11'],adEvery:5,tags:['physics','electricity','waves','كهرباء'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-01'},
  {id:'m21',title:'Chemistry Organic Notes — Language School Year 2',subject:'Chemistry',grade:'الصف الثاني الثانوي',country:'Egypt',school:'لغات (Language School)',lang:'en',author:'محمد الشريف',authorId:'u16',views:6200,likes:920,pages:14,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['chemistry','organic','كيمياء','لغات'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-05'},

  // ── Egypt · Government · Grade 12 (Thanawi Amma) ──────────
  {id:'m3',title:'الكيمياء العضوية الشاملة — الثانوية العامة',subject:'Chemistry',grade:'الصف الثالث الثانوي (الثانوية العامة)',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'منى طاهر',authorId:'u4',views:21000,likes:3400,pages:32,isPaid:true,isPromoted:false,isSponsored:true,companyAds:['c12','c1'],adEvery:6,tags:['chemistry','كيمياء','عضوية'],approved:true,audience:'students',membershipRequired:true,createdAt:'2025-02-28'},
  {id:'m22',title:'ملخص الأحياء الكامل — الثانوية العامة (وراثة وبيئة)',subject:'Biology',grade:'الصف الثالث الثانوي (الثانوية العامة)',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'فاطمة الزهراء',authorId:'u15',views:31500,likes:5800,pages:38,isPaid:true,isPromoted:true,isSponsored:true,companyAds:['c2','c1'],adEvery:5,tags:['biology','أحياء','وراثة','بيئة'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-03-01'},
  {id:'m23',title:'رياضيات الثانوية العامة — التفاضل والتكامل وحساب المثلثات',subject:'Mathematics',grade:'الصف الثالث الثانوي (الثانوية العامة)',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'فاطمة الزهراء',authorId:'u15',views:28000,likes:4900,pages:44,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c5'],adEvery:6,tags:['math','رياضيات','تفاضل','مثلثات'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-02-15'},
  {id:'m24',title:'فيزياء الثانوية العامة — الموجات والبصريات والمجالات',subject:'Physics',grade:'الصف الثالث الثانوي (الثانوية العامة)',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'منى طاهر',authorId:'u4',views:19200,likes:3200,pages:28,isPaid:true,isPromoted:false,isSponsored:true,companyAds:['c11'],adEvery:6,tags:['physics','فيزياء','موجات','بصريات'],approved:true,audience:'students',membershipRequired:true,createdAt:'2025-03-10'},
  {id:'m25',title:'اللغة العربية الثانوية العامة — نصوص ونحو وبلاغة',subject:'Arabic',grade:'الصف الثالث الثانوي (الثانوية العامة)',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'يوسف الغزالي',authorId:'u6',views:38000,likes:7200,pages:50,isPaid:true,isPromoted:true,isSponsored:true,companyAds:['c2'],adEvery:4,tags:['arabic','نحو','نصوص','بلاغة','ثانوية عامة'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-01-10'},
  {id:'m26',title:'تاريخ الثانوية العامة — مصر والعالم الحديث',subject:'History',grade:'الصف الثالث الثانوي (الثانوية العامة)',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'فاطمة الزهراء',authorId:'u15',views:15400,likes:2800,pages:30,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['history','تاريخ','ثانوية عامة'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-02-20'},
  {id:'m27',title:'جغرافيا الثانوية العامة — جغرافية مصر والعالم',subject:'Geography',grade:'الصف الثالث الثانوي (الثانوية العامة)',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'محمد الشريف',authorId:'u16',views:12100,likes:2100,pages:22,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['geography','جغرافيا'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-03-05'},
  {id:'m32',title:'الفيزياء — الإلكترونيات والتكنولوجيا الحديثة (ثانوية عامة)',subject:'Physics',grade:'الصف الثالث الثانوي (الثانوية العامة)',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'أحمد السيد',authorId:'u2',views:11200,likes:1920,pages:20,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c16'],adEvery:6,tags:['physics','فيزياء','إلكترونيات'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-20'},

  // ── Egypt · Grade 10 (Awwal Thanawi) ──────────────────────
  {id:'m15',title:'رياضيات الصف الأول الثانوي — المتجهات والمصفوفات',subject:'Mathematics',grade:'الصف الأول الثانوي',country:'Egypt',school:'لغات (Language School)',lang:'ar',author:'هنا محمود',authorId:'u10',views:5600,likes:780,pages:12,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['math','vectors','رياضيات','متجهات'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-10'},
  {id:'m16',title:'كيمياء الصف الأول الثانوي — المادة وتحولاتها',subject:'Chemistry',grade:'الصف الأول الثانوي',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'منى طاهر',authorId:'u4',views:8100,likes:1200,pages:14,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['chemistry','كيمياء'],approved:true,audience:'students',membershipRequired:true,createdAt:'2025-04-12'},
  {id:'m28',title:'فيزياء الصف الأول الثانوي — الحركة والقوى',subject:'Physics',grade:'الصف الأول الثانوي',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'أحمد السيد',authorId:'u2',views:7400,likes:1050,pages:16,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['physics','فيزياء','حركة','قوى'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-15'},
  {id:'m33',title:'أحياء الصف الأول الثانوي — الخلية والوراثة المندلية',subject:'Biology',grade:'الصف الأول الثانوي',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'فاطمة الزهراء',authorId:'u15',views:6900,likes:1050,pages:14,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['biology','أحياء','خلية','وراثة'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-18'},

  // ── Egypt · Grade 9 (Thanawi Preparatory) ─────────────────
  {id:'m5',title:'ملخص النحو والصرف الكامل — الصف الثالث الإعدادي',subject:'Arabic',grade:'الصف الثالث الإعدادي',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'يوسف الغزالي',authorId:'u6',views:31000,likes:5200,pages:40,isPaid:true,isPromoted:true,isSponsored:true,companyAds:['c2'],adEvery:4,tags:['arabic','نحو','صرف','قواعد'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-01-20'},
  {id:'m11',title:'فيزياء الكهرباء والمغناطيسية — الصف الثالث الإعدادي',subject:'Physics',grade:'الصف الثالث الإعدادي',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'علي حسن',authorId:'u12',views:9300,likes:1340,pages:15,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['physics','electricity','فيزياء','كهرباء'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-02'},
  {id:'m29',title:'رياضيات الثالث الإعدادي — الجبر والهندسة الكاملة',subject:'Mathematics',grade:'الصف الثالث الإعدادي',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'يوسف الغزالي',authorId:'u6',views:22000,likes:3800,pages:26,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c12'],adEvery:5,tags:['math','رياضيات','جبر','هندسة'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-02-10'},
  {id:'m30',title:'علوم الثالث الإعدادي — الفيزياء والكيمياء والأحياء',subject:'Biology',grade:'الصف الثالث الإعدادي',country:'Egypt',school:'حكومي (Government)',lang:'ar',author:'فاطمة الزهراء',authorId:'u15',views:17500,likes:3100,pages:28,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['science','علوم','أحياء','فيزياء','كيمياء'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-03-18'},

  // ── Egypt · University / Colleagues ────────────────────────
  {id:'m13',title:'Software Engineering Fundamentals — University',subject:'Computer Science',grade:'University',country:'Egypt',school:'University',lang:'en',author:'Dr. Karim N.',authorId:'u7',views:4200,likes:610,pages:18,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c1'],adEvery:6,tags:['computer science','software engineering','برمجة'],approved:true,audience:'colleagues',membershipRequired:false,createdAt:'2025-04-05'},
  {id:'m31',title:'مقدمة في قواعد البيانات — MySQL وSQLite',subject:'Computer Science',grade:'University',country:'Egypt',school:'University',lang:'ar',author:'د. عمر فاروق',authorId:'u14',views:3800,likes:580,pages:20,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['computer science','database','برمجة','SQL'],approved:true,audience:'colleagues',membershipRequired:false,createdAt:'2025-04-20'},
  {id:'m34',title:'Data Structures & Algorithms — CS University',subject:'Computer Science',grade:'University',country:'Egypt',school:'University',lang:'en',author:'Dr. Karim N.',authorId:'u7',views:5100,likes:820,pages:22,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c15'],adEvery:6,tags:['computer science','algorithms','data structures'],approved:true,audience:'colleagues',membershipRequired:false,createdAt:'2025-05-01'},

  // ── IB / International ──────────────────────────────────────
  {id:'m2',title:'Calculus Made Simple — DP Year 1 IB',subject:'Mathematics',grade:'DP Year 1',country:'International (IB / No Fixed Country)',school:'IB World School',lang:'en',author:'Sara K.',authorId:'u3',views:8900,likes:1120,pages:18,isPaid:true,isPromoted:true,isSponsored:false,companyAds:['c11'],adEvery:5,tags:['calculus','IB','math','تفاضل'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-03-15'},
  {id:'m6',title:'Quantum Mechanics Essentials — University Level',subject:'Physics',grade:'University',country:'International (IB / No Fixed Country)',school:'University',lang:'en',author:'Dr. Karim N.',authorId:'u7',views:9800,likes:1540,pages:28,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c9'],adEvery:7,tags:['quantum','physics'],approved:true,audience:'colleagues',membershipRequired:false,createdAt:'2025-03-01'},
  {id:'m35',title:'IB Biology HL — Genetics & Evolution Complete Notes',subject:'Biology',grade:'DP Year 2',country:'International (IB / No Fixed Country)',school:'IB World School',lang:'en',author:'Priya S.',authorId:'u13',views:7200,likes:1100,pages:24,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c7'],adEvery:6,tags:['biology','IB','genetics','evolution'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-10'},

  // ── United Kingdom ──────────────────────────────────────────
  {id:'m10',title:'Statistics & Probability — Year 11 GCSE',subject:'Statistics',grade:'Year 11 (GCSE)',country:'United Kingdom',school:'State School (Academy)',lang:'en',author:'James O.',authorId:'u11',views:5400,likes:720,pages:16,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['statistics','GCSE','probability'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-02-14'},
  {id:'m12',title:'Biology Genetics — Year 13 A-Level',subject:'Biology',grade:'Year 13 (A-Level)',country:'United Kingdom',school:'Grammar School',lang:'en',author:'Priya S.',authorId:'u13',views:6100,likes:830,pages:19,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c7'],adEvery:6,tags:['biology','genetics','A-Level'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-03-28'},
  {id:'m36',title:'A-Level Chemistry — Organic Chemistry & Mechanisms',subject:'Chemistry',grade:'Year 13 (A-Level)',country:'United Kingdom',school:'Grammar School',lang:'en',author:'James O.',authorId:'u11',views:4800,likes:690,pages:20,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c9'],adEvery:7,tags:['chemistry','A-Level','organic'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-12'},

  // ── Malaysia ────────────────────────────────────────────────
  {id:'m4',title:'Biology Cell Division — IGCSE Form 4',subject:'Biology',grade:'Form 4',country:'Malaysia',school:'Sekolah Kebangsaan',lang:'en',author:'Lim Wei',authorId:'u5',views:6700,likes:890,pages:14,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['biology','IGCSE','cells'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-03-18'},
  {id:'m37',title:'SPM Mathematics — Form 5 Complete Revision',subject:'Mathematics',grade:'Form 5 (SPM)',country:'Malaysia',school:'Sekolah Kebangsaan',lang:'en',author:'Lim Wei',authorId:'u5',views:5200,likes:780,pages:18,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['math','SPM','form 5'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-05'},

  // ── United States ───────────────────────────────────────────
  {id:'m8',title:'Organic Chemistry AP — Grade 12',subject:'Chemistry',grade:'Grade 12 (Senior)',country:'United States',school:'Public School',lang:'en',author:'Alex M.',authorId:'u9',views:7200,likes:980,pages:12,isPaid:true,isPromoted:true,isSponsored:false,companyAds:['c3'],adEvery:5,tags:['chemistry','organic','AP'],approved:false,audience:'students',membershipRequired:false,createdAt:'2025-04-01'},
  {id:'m38',title:'US History — Civil War to Civil Rights Movement',subject:'History',grade:'Grade 11 (Junior)',country:'United States',school:'Public School',lang:'en',author:'Sara K.',authorId:'u3',views:4300,likes:620,pages:14,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['history','US history','civil war'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-18'},

  // ── France ──────────────────────────────────────────────────
  {id:'m39',title:'Mathématiques Terminale — Analyse et Probabilités',subject:'Mathematics',grade:'Terminale',country:'France',school:'Public',lang:'fr',author:'Inès Moreau',authorId:'u19',views:6800,likes:1020,pages:22,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c13'],adEvery:6,tags:['maths','terminale','bac','analyse'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-03-20'},
  {id:'m40',title:'Philosophie Terminale — Les Grands Textes du BAC',subject:'Philosophy',grade:'Terminale',country:'France',school:'Public',lang:'fr',author:'Inès Moreau',authorId:'u19',views:5100,likes:780,pages:18,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['philosophie','terminale','bac'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-01'},

  // ── Nigeria ──────────────────────────────────────────────────
  {id:'m41',title:'WAEC Biology — Genetics, Ecology & Evolution',subject:'Biology',grade:'SSS 3 (WAEC)',country:'Nigeria',school:'Federal Government College',lang:'en',author:'Chidi Nwosu',authorId:'u20',views:8900,likes:1450,pages:28,isPaid:true,isPromoted:true,isSponsored:false,companyAds:['c7'],adEvery:5,tags:['biology','WAEC','genetics','ecology'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-03-25'},
  {id:'m42',title:'JAMB Chemistry — Complete Revision Notes',subject:'Chemistry',grade:'SSS 3 (WAEC)',country:'Nigeria',school:'Federal Government College',lang:'en',author:'Chidi Nwosu',authorId:'u20',views:7100,likes:1180,pages:20,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c13'],adEvery:6,tags:['chemistry','JAMB','WAEC','Nigeria'],approved:true,audience:'students',membershipRequired:true,createdAt:'2025-04-05'},
  {id:'m43',title:'WAEC Mathematics — Algebra, Geometry & Statistics',subject:'Mathematics',grade:'SSS 3 (WAEC)',country:'Nigeria',school:'Federal Government College',lang:'en',author:'Chidi Nwosu',authorId:'u20',views:9300,likes:1620,pages:24,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['math','WAEC','JAMB','Nigeria'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-12'},

  // ── Ghana ────────────────────────────────────────────────────
  {id:'m44',title:'WASSCE Elective Mathematics — SHS 3',subject:'Mathematics',grade:'SHS 3 (WASSCE)',country:'Ghana',school:'Private',lang:'en',author:'Kofi Asante',authorId:'u17',views:5600,likes:890,pages:18,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c7'],adEvery:6,tags:['math','WASSCE','SHS','Ghana'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-15'},
  {id:'m45',title:'WASSCE Physics — Core Concepts & Past Questions',subject:'Physics',grade:'SHS 3 (WASSCE)',country:'Ghana',school:'Private',lang:'en',author:'Kofi Asante',authorId:'u17',views:4200,likes:670,pages:16,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['physics','WASSCE','Ghana'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-05-01'},

  // ── China ────────────────────────────────────────────────────
  {id:'m46',title:'高考数学 — 高三全套复习笔记 (Gaokao Math)',subject:'Mathematics',grade:'高三 (高考/Gaokao)',country:'China',school:'公立 (Public)',lang:'zh',author:'Chen Li',authorId:'u18',views:12400,likes:2100,pages:36,isPaid:true,isPromoted:true,isSponsored:false,companyAds:['c15','c16'],adEvery:5,tags:['math','高考','gaokao','数学'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-03-18'},
  {id:'m47',title:'高考物理 — 力学与电磁学 (Physics Mechanics)',subject:'Physics',grade:'高三 (高考/Gaokao)',country:'China',school:'公立 (Public)',lang:'zh',author:'Chen Li',authorId:'u18',views:9800,likes:1680,pages:28,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c15'],adEvery:6,tags:['physics','高考','gaokao','物理'],approved:true,audience:'students',membershipRequired:true,createdAt:'2025-04-10'},

  // ── Saudi Arabia ─────────────────────────────────────────────
  {id:'m48',title:'ملخص الرياضيات — الصف الثالث الثانوي (المسار العلمي)',subject:'Mathematics',grade:'الصف الثالث الثانوي',country:'Saudi Arabia',school:'حكومي',lang:'ar',author:'يوسف الغزالي',authorId:'u6',views:14500,likes:2600,pages:30,isPaid:true,isPromoted:true,isSponsored:false,companyAds:['c1','c2'],adEvery:5,tags:['رياضيات','ثانوية','السعودية','اختبارات'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-03-28'},
  {id:'m49',title:'فيزياء الصف الثاني الثانوي — السعودية',subject:'Physics',grade:'الصف الثاني الثانوي',country:'Saudi Arabia',school:'حكومي',lang:'ar',author:'أحمد السيد',authorId:'u2',views:8200,likes:1400,pages:18,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['فيزياء','السعودية','ثانوي'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-22'},

  // ── Morocco ──────────────────────────────────────────────────
  {id:'m50',title:'Mathématiques 2ème Bac Sciences — Analyse Complexe',subject:'Mathematics',grade:'2ème Bac',country:'Morocco',school:'Public (وزارة التربية)',lang:'fr',author:'Inès Moreau',authorId:'u19',views:7400,likes:1250,pages:26,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c13'],adEvery:6,tags:['maths','bac','maroc','analyse'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-08'},

  // ── Turkey ──────────────────────────────────────────────────
  {id:'m51',title:'YKS Matematik — 12. Sınıf Tam Özet',subject:'Mathematics',grade:'12. Sınıf (YKS)',country:'Turkey',school:'Devlet Okulu',lang:'tr',author:'Sara K.',authorId:'u3',views:5800,likes:920,pages:20,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c14'],adEvery:6,tags:['math','YKS','Turkey','matematik'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-20'},

  // ── India ────────────────────────────────────────────────────
  {id:'m52',title:'Class 12 Physics — JEE/NEET Complete Revision',subject:'Physics',grade:'Class 12 (JEE/NEET)',country:'India',school:'Private (CBSE)',lang:'en',author:'Priya S.',authorId:'u13',views:11200,likes:1980,pages:32,isPaid:true,isPromoted:true,isSponsored:false,companyAds:['c13','c8'],adEvery:5,tags:['physics','JEE','NEET','India','CBSE'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-03-15'},
  {id:'m53',title:'Class 12 Chemistry — Organic & Inorganic (CBSE)',subject:'Chemistry',grade:'Class 12 (JEE/NEET)',country:'India',school:'Private (CBSE)',lang:'en',author:'Priya S.',authorId:'u13',views:8700,likes:1540,pages:26,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c13'],adEvery:6,tags:['chemistry','JEE','India','CBSE'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-02'},

  // ── Brazil ──────────────────────────────────────────────────
  {id:'m54',title:'ENEM Matemática — Guia Completo de Revisão',subject:'Mathematics',grade:'3ª Série EM (ENEM)',country:'Brazil',school:'Escola Privada',lang:'pt',author:'Sara K.',authorId:'u3',views:6300,likes:1050,pages:22,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c13'],adEvery:6,tags:['math','ENEM','Brasil','matemática'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-15'},

  // ── Pakistan ─────────────────────────────────────────────────
  {id:'m55',title:'FSc Chemistry Part 2 — Complete Summary',subject:'Chemistry',grade:'Class 12 (FSc)',country:'Pakistan',school:'Private (Cambridge)',lang:'en',author:'Sara K.',authorId:'u3',views:7900,likes:1320,pages:24,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c9'],adEvery:6,tags:['chemistry','FSc','Pakistan','board'],approved:true,audience:'students',membershipRequired:false,createdAt:'2025-04-20'},

  // ── Pending Review ───────────────────────────────────────────
  {id:'m56',title:'Pending: A-Level Further Mathematics',subject:'Mathematics',grade:'Year 13 (A-Level)',country:'United Kingdom',school:'Independent School',lang:'en',author:'James O.',authorId:'u11',views:0,likes:0,pages:10,isPaid:false,isPromoted:false,isSponsored:false,companyAds:[],adEvery:0,tags:['math','A-Level','further'],approved:false,audience:'students',membershipRequired:false,createdAt:'2025-05-05'},
  {id:'m57',title:'Pending: WASSCE Economics — SSS 3',subject:'Economics',grade:'SSS 3 (WAEC)',country:'Nigeria',school:'Federal Government College',lang:'en',author:'Chidi Nwosu',authorId:'u20',views:0,likes:0,pages:12,isPaid:true,isPromoted:false,isSponsored:false,companyAds:['c8'],adEvery:6,tags:['economics','WAEC','Nigeria'],approved:false,audience:'students',membershipRequired:false,createdAt:'2025-05-06'},
];

// ── KEEP MOCK DATES RELATIVE TO "NOW" ─────────────────────────────
// The createdAt values above were written as fixed 2025 dates. Without
// this, every mock summary eventually becomes "old" relative to whoever
// is actually running the app, and the recency-decay scoring in app.js
// (_recencyFactor) clamps to its floor for all of them at once — silently
// flattening recency out of the mock recommendation feed entirely. This
// re-anchors every summary to "now" each time data.js loads, while
// preserving the exact original chronological order and day-gaps between
// summaries (computed once from the dates above, kept as a fixed offset
// table here so the *relative* timeline never has to be hand-maintained).
(function () {
  var DAYS_AGO = {
    m1:57,m7:45,m14:28,m9:62,m20:35,m21:31,m3:67,m22:66,m23:80,m24:57,
    m25:116,m26:75,m27:62,m32:16,m15:26,m16:24,m28:21,m33:18,m5:106,m11:34,
    m29:85,m30:49,m13:31,m31:16,m34:5,m2:52,m6:66,m35:26,m10:81,m12:39,
    m36:24,m4:49,m37:31,m8:35,m38:18,m39:47,m40:35,m41:42,m42:31,m43:24,
    m44:21,m45:5,m46:49,m47:26,m48:39,m49:14,m50:28,m51:16,m52:52,m53:34,
    m54:21,m55:16,m56:1,m57:0
  };
  var now = Date.now();
  MOCK_SUMMARIES.forEach(function (s) {
    if (DAYS_AGO.hasOwnProperty(s.id)) {
      s.createdAt = new Date(now - DAYS_AGO[s.id] * 86400000).toISOString().slice(0, 10);
    }
  });
})();

// ══════════════════════════════════════════════════════════════
//  MEMBERSHIP STORE
// ══════════════════════════════════════════════════════════════
var USER_MEMBERSHIPS = window.USER_MEMBERSHIPS = {};

// ══════════════════════════════════════════════════════════════
//  AVATAR/BANNER STORE (frontend-only, persisted to localStorage)
// ══════════════════════════════════════════════════════════════
// Profile photo and banner are stored as data URLs on the user object:
//   user.avatar  — base64 data URL of cropped square photo
//   user.banner  — base64 data URL of cropped wide banner  (optional)
//   user.bannerColor — CSS gradient fallback when no banner uploaded
// These are read by renderProfile() and renderCreator().

// ── MOCK_IP_BANS — used by admin IP ban panel ─────────────────────
var MOCK_IP_BANS = window.MOCK_IP_BANS = [];

// ── ENGAGEMENT — per-summary useful/dislike counts ────────────────
// Structure: { [summaryId]: { likes, dislikes, usefuls } }
// Pre-seeded with some data so recommendation scoring is meaningful
var ENGAGEMENT = window.ENGAGEMENT = {
  'm1':  { likes: 1830, dislikes: 42,  usefuls: 1200 },
  'm2':  { likes: 1120, dislikes: 18,  usefuls: 890  },
  'm3':  { likes: 3400, dislikes: 95,  usefuls: 2800 },
  'm4':  { likes: 890,  dislikes: 12,  usefuls: 620  },
  'm5':  { likes: 5200, dislikes: 110, usefuls: 4100 },
  'm6':  { likes: 1540, dislikes: 28,  usefuls: 1200 },
  'm7':  { likes: 2800, dislikes: 56,  usefuls: 2200 },
  'm9':  { likes: 1970, dislikes: 38,  usefuls: 1550 },
  'm11': { likes: 1340, dislikes: 22,  usefuls: 980  },
  'm22': { likes: 5800, dislikes: 130, usefuls: 4600 },
  'm25': { likes: 7200, dislikes: 180, usefuls: 5800 },
  'm41': { likes: 1450, dislikes: 20,  usefuls: 1100 },
  'm46': { likes: 2100, dislikes: 44,  usefuls: 1700 },
};
