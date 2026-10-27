// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests: guardrail jawaban hukum
// ─────────────────────────────────────────────────────────────────────────────

describe('lib/legalGuardrails', () => {
  let g;
  beforeAll(async () => {
    g = await import('@/lib/legalGuardrails');
  });

  const general = [
    'Apa saja hak pekerja yang di-PHK?',
    'Berapa lama maksimal PKWT berdasarkan jangka waktu?',
    'Bagaimana cara mengurus akta kelahiran?',
    'Apa syarat sahnya perjanjian menurut KUHPerdata?',
    'Bagaimana prosedur gugatan cerai di pengadilan agama?',
    'Apa sanksi bagi perusahaan yang tidak membayar upah minimum?',
  ];
  test.each(general)('TC-GUARD-01: pertanyaan umum → %s', (q) => {
    expect(g.classifyQuestion(q)).toEqual({ type: 'umum', signals: [] });
  });

  const specific = [
    ['Saya di-PHK tanpa pesangon, apakah saya bisa menggugat?', 'situasi_pribadi'],
    ['Atasan saya tidak membayar lembur, apa yang harus saya lakukan?', 'strategi'],
    ['Saya sudah bekerja 5 tahun dengan gaji 6 juta, berapa pesangon yang saya dapat?', 'hitungan_pribadi'],
    ['Suamiku berselingkuh, bisakah saya menuntut?', 'penilaian_hasil'],
    ['Apakah saya pasti menang kalau menggugat developer?', 'penilaian_hasil'],
    ['Tanah warisan keluarga kami dikuasai paman, bagaimana hukumnya?', 'situasi_pribadi'],
  ];
  test.each(specific)('TC-GUARD-02: pertanyaan spesifik → %s', (q, signal) => {
    const r = g.classifyQuestion(q);
    expect(r.type).toBe('spesifik');
    expect(r.signals).toContain(signal);
  });

  test('TC-GUARD-03: kekuatan dukungan dokumen dari skor kemiripan teratas', () => {
    const { weak, none } = g.EVIDENCE_THRESHOLDS;
    expect(g.assessEvidence([{ score: weak + 0.05 }, { score: 0.1 }]).level).toBe('cukup');
    expect(g.assessEvidence([{ score: (weak + none) / 2 }]).level).toBe('terbatas');
    expect(g.assessEvidence([{ score: none - 0.05 }]).level).toBe('tidak_ada');
    expect(g.assessEvidence([]).level).toBe('tidak_ada');
    expect(g.assessEvidence([{ metadata: {} }]).level).toBe('tidak_ada'); // tanpa skor → dianggap lemah
  });

  test('TC-GUARD-04: peringatan konsultasi hanya untuk pertanyaan spesifik, tidak ganda', () => {
    expect(g.consultationNote('Jawaban', 'umum')).toBe('');
    expect(g.consultationNote('Jawaban', 'spesifik')).toContain('bukan pengganti konsultasi');
    expect(g.consultationNote('Ini bukan pengganti konsultasi dengan advokat.', 'spesifik')).toBe('');
  });

  test('TC-GUARD-05: nama dokumen diambil dari format kutipan sumber', () => {
    const answer = 'Hak cuti **(Sumber: PERDA No 06 Tahun 2023, Hal: 1-25)**. Lalu **(Sumber: PP Nomor 35 Tahun 2021, Hal: 3; UU Nomor 13 Tahun 2003, Hal: 40)**.';
    expect(g.extractCitedTitles(answer)).toEqual(['PERDA No 06 Tahun 2023', 'PP Nomor 35 Tahun 2021', 'UU Nomor 13 Tahun 2003']);
  });

  test('TC-GUARD-06: kutipan yang ada di dokumen lolos; kutipan karangan terdeteksi', () => {
    const docs = ['Regulasi Ketenagakerjaan - PERDA No 06 Tahun 2023', 'Peraturan Pemerintah Nomor 35 Tahun 2021 tentang PKWT'];
    const answer = '(Sumber: Regulasi Ketenagakerjaan - PERDA No 06 Tahun 2023, Hal: 2) '
      + '(Sumber: PP No 35 Th 2021, Hal: 4) '
      + '(Sumber: UU Nomor 99 Tahun 2030, Hal: 1)';
    expect(g.findUnverifiedCitations(answer, docs)).toEqual(['UU Nomor 99 Tahun 2030']);
    expect(g.unverifiedCitationNote(['UU Nomor 99 Tahun 2030'])).toContain('belum dapat diverifikasi');
    expect(g.unverifiedCitationNote([])).toBe('');
  });

  test('TC-GUARD-07: nomor/tahun berbeda dianggap dokumen lain walau judul mirip', () => {
    expect(g.findUnverifiedCitations('(Sumber: PERDA No 07 Tahun 2023, Hal: 1)', ['PERDA No 06 Tahun 2023'])).toEqual(['PERDA No 07 Tahun 2023']);
  });
});
