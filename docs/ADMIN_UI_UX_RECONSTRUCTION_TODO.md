# AKURAT Admin UI/UX Reconstruction — Master To-Do List

## 1. Tujuan Dokumen

Dokumen ini menjadi sumber kerja utama untuk merekonstruksi seluruh admin panel AKURAT secara bertahap. Setiap halaman harus diselesaikan sebagai alat kerja yang nyata, bukan hanya tampilan statis.

Hasil akhir yang dituju:

- Admin dapat memahami kondisi platform dalam beberapa detik.
- Informasi penting mudah ditemukan tanpa memenuhi layar dengan terlalu banyak kartu.
- Setiap data memiliki konteks, status, serta tindakan lanjutan yang jelas.
- Pengelolaan pengguna, pembelajaran, ujian, dan sistem dapat dilakukan tanpa alur membingungkan.
- Sistem dapat dipakai untuk Kimia maupun mata pelajaran lain.
- Struktur kategori tetap mudah digunakan meskipun jumlah mata pelajaran, kurikulum, topik, dan subtopik bertambah.
- Interaksi terasa hidup, fluid, dan profesional tanpa animasi berat.
- Tampilan memiliki karakter produk AKURAT dan menghindari pola visual generik atau AI slop.

---

## 2. Prinsip Produk dan UX Wajib

### 2.1 Prinsip informasi

- [ ] Setiap halaman harus menjawab tiga pertanyaan: apa yang terjadi, apa yang membutuhkan perhatian, dan tindakan apa yang dapat dilakukan.
- [ ] Prioritaskan informasi berdasarkan urgensi dan frekuensi penggunaan.
- [ ] Jangan menampilkan metrik tanpa nama, definisi, periode data, dan konteks pembanding.
- [ ] Jangan menggunakan angka dummy atau insight palsu ketika API belum menyediakan data.
- [ ] Gunakan label yang sesuai makna data sebenarnya.
- [ ] Bedakan status akun, aktivitas pengguna, performa belajar, dan status operasional.
- [ ] Hindari duplikasi informasi antara Dashboard, Analitik, dan halaman manajemen.
- [ ] Sediakan jalur drill-down dari ringkasan menuju data sumber.
- [ ] Pertahankan konteks filter saat pengguna kembali dari detail ke listing.
- [ ] Gunakan Bahasa Indonesia yang konsisten, ringkas, dan tidak ambigu.

### 2.2 Prinsip visual

- [ ] Gunakan hirarki visual melalui ukuran, jarak, kontras, dan alignment sebelum menambahkan warna.
- [ ] Batasi warna aksen pada warna brand, status, dan tindakan penting.
- [ ] Hindari gradient dekoratif yang tidak memiliki makna.
- [ ] Hindari glow, glassmorphism, icon blob, ilustrasi abstrak, dan kartu berlapis yang membuat produk terasa generik.
- [ ] Hindari terlalu banyak card dengan bentuk dan bobot visual yang sama.
- [ ] Gunakan permukaan putih atau netral dengan border tipis dan shadow sangat ringan.
- [ ] Gunakan radius secara konsisten; jangan mencampurkan terlalu banyak variasi.
- [ ] Pastikan tabel tetap menjadi komponen utama untuk pekerjaan data yang padat.
- [ ] Gunakan visualisasi hanya jika hubungan data lebih mudah dipahami melalui chart.
- [ ] Pastikan chart memiliki label, legenda, tooltip, periode, dan empty state yang jelas.

### 2.3 Prinsip interaksi

- [ ] Setiap tombol harus memiliki label yang menjelaskan hasil tindakan.
- [ ] Gunakan satu primary action utama per konteks halaman.
- [ ] Bedakan primary, secondary, tertiary, dan destructive action.
- [ ] Destructive action wajib memiliki confirmation dialog dengan nama target dan dampaknya.
- [ ] Aksi sensitif wajib meminta alasan jika dibutuhkan untuk audit.
- [ ] Setelah aksi selesai, tampilkan feedback berhasil atau gagal yang spesifik.
- [ ] Jangan menutup modal jika submit gagal.
- [ ] Cegah double submit dan tampilkan progress pada tombol.
- [ ] Gunakan optimistic update hanya untuk tindakan yang mudah dipulihkan.
- [ ] Sediakan undo untuk tindakan ringan seperti archive atau pemindahan kategori bila memungkinkan.

### 2.4 Prinsip aksesibilitas

- [ ] Seluruh fungsi utama dapat digunakan dengan keyboard.
- [ ] Sediakan focus state yang terlihat jelas.
- [ ] Gunakan elemen HTML semantik.
- [ ] Berikan accessible name pada tombol ikon.
- [ ] Tooltip dapat dibuka melalui hover dan keyboard focus.
- [ ] Jangan menggunakan warna sebagai satu-satunya pembeda status.
- [ ] Pastikan rasio kontras teks dan komponen memenuhi WCAG AA.
- [ ] Pastikan urutan tab mengikuti urutan visual.
- [ ] Modal dan drawer harus mengunci fokus dengan benar.
- [ ] Sediakan skip-to-content.
- [ ] Gunakan aria-live untuk status proses yang penting.

---

## 3. Fondasi Design System Admin

### 3.1 Design tokens

- [ ] Audit warna AKURAT yang sedang digunakan.
- [ ] Tentukan warna brand utama dan warna aksen sekunder.
- [ ] Tentukan warna semantic: success, warning, danger, information, neutral.
- [ ] Tentukan warna background halaman, panel, elevated panel, dan selected state.
- [ ] Buat skala typography untuk display, page title, section title, body, label, caption, dan data numerik.
- [ ] Gunakan tabular number untuk data angka, nilai, dan timestamp.
- [ ] Tentukan spacing scale berbasis kelipatan 4px.
- [ ] Tentukan border radius untuk control, card, modal, dan badge.
- [ ] Tentukan shadow yang ringan dan konsisten.
- [ ] Tentukan ukuran kontrol: compact, default, dan comfortable.
- [ ] Dokumentasikan state hover, focus, active, selected, disabled, loading, dan error.

### 3.2 Komponen reusable

- [ ] AdminPageHeader.
- [ ] Breadcrumb.
- [ ] ContextBadge.
- [ ] PrimaryAction.
- [ ] FilterBar.
- [ ] ActiveFilterChips.
- [ ] AdvancedFilterDrawer.
- [ ] SearchInput dengan debounce.
- [ ] DataTable.
- [ ] TableColumnManager.
- [ ] TableDensityControl.
- [ ] BulkActionBar.
- [ ] Pagination.
- [ ] StatusBadge.
- [ ] MetricCard.
- [ ] AlertSummary.
- [ ] SectionCard.
- [ ] DetailDrawer.
- [ ] Tabs dan segmented control.
- [ ] EmptyState.
- [ ] ErrorState.
- [ ] SkeletonState.
- [ ] InlineLoading.
- [ ] ConfirmationDialog.
- [ ] DestructiveConfirmationDialog.
- [ ] Toast dan persistent notification.
- [ ] DateRangePicker.
- [ ] SubjectTaxonomyPicker.
- [ ] EntityPicker.
- [ ] UserAvatar dan identity block.
- [ ] Timeline.
- [ ] ActivityFeed.
- [ ] ChartContainer.
- [ ] ExportMenu.
- [ ] CommandPalette.

### 3.3 State wajib setiap halaman

- [ ] Initial loading.
- [ ] Background refresh.
- [ ] Empty database.
- [ ] Empty search result.
- [ ] Empty filtered result.
- [ ] Partial data.
- [ ] API error.
- [ ] Permission denied.
- [ ] Offline atau koneksi terputus.
- [ ] Read-only mode.
- [ ] Mobile layout.
- [ ] Reduced motion.

---

## 4. Admin Shell, Sidebar, dan Navigasi

### 4.1 Struktur navigasi

- [ ] Kelompokkan navigasi menjadi Umum, Civitas, Sekolah, AKURAT Exam, dan Sistem & Pengaturan.
- [ ] Pastikan satu fitur tidak tampil pada dua grup berbeda tanpa alasan.
- [ ] Pisahkan Analitik Umum dan Analitik AKURAT Exam.
- [ ] Tempatkan Guru, Siswa, Exam User, dan User & Permission dalam konteks Civitas/Akses yang jelas.
- [ ] Pisahkan Ujian Sekolah dari AKURAT Exam.
- [ ] Pisahkan halaman operasional live dari halaman hasil historis.
- [ ] Tampilkan badge jumlah item yang perlu perhatian hanya jika relevan.

### 4.2 Sidebar collapse dan expand

- [ ] Tambahkan tombol collapse di sebelah kanan search bar sidebar.
- [ ] Gunakan tombol dengan ikon panel-left-close saat sidebar terbuka.
- [ ] Gunakan tombol dengan ikon panel-left-open saat sidebar tertutup.
- [ ] Mode expanded menampilkan logo, nama produk, search, label section, ikon, label menu, submenu, dan profil.
- [ ] Mode collapsed hanya menampilkan logo, ikon menu, indikator aktif, dan tombol expand.
- [ ] Tampilkan tooltip menu ketika sidebar collapsed.
- [ ] Submenu pada mode collapsed dibuka sebagai flyout yang dapat diakses keyboard.
- [ ] Pastikan tombol expand tetap terlihat dan mudah ditemukan.
- [ ] Simpan preferensi sidebar pada local storage.
- [ ] Jangan menyebabkan content layout shift yang kasar.
- [ ] Gunakan transisi lebar 180–220ms.
- [ ] Nonaktifkan animasi transisi saat reduced motion aktif.
- [ ] Pada tablet/mobile, gunakan navigation drawer dan backdrop.
- [ ] Pastikan drawer dapat ditutup dengan Escape, backdrop, dan tombol close.
- [ ] Jangan menampilkan sidebar collapsed desktop pada layar mobile.

### 4.3 Search navigasi

- [ ] Search dapat menemukan parent menu dan submenu.
- [ ] Highlight bagian kata yang cocok.
- [ ] Tampilkan kategori asal setiap hasil.
- [ ] Search dapat digunakan dengan keyboard.
- [ ] Tampilkan empty result yang informatif.
- [ ] Tombol collapse tidak mengganggu lebar search input.
- [ ] Saat collapsed, search dipindahkan ke command palette atau tombol ikon.

### 4.4 Topbar

- [ ] Tampilkan breadcrumb dan konteks halaman.
- [ ] Sediakan global search/command palette.
- [ ] Sediakan notification center.
- [ ] Sediakan status koneksi jika relevan.
- [ ] Sediakan user menu dengan profil, preferensi, bantuan, dan keluar.
- [ ] Preview sebagai siswa/guru/exam hanya tersedia bagi admin yang berwenang.
- [ ] Berikan penanda jelas saat admin sedang berada dalam preview mode.

---

## 5. Sistem Kategorisasi Lintas Mata Pelajaran

### 5.1 Model taxonomy

- [ ] Gunakan struktur utama: Mata Pelajaran → Kurikulum → Jenjang/Kelas → Unit → Topik → Subtopik → Tujuan Pembelajaran.
- [ ] Jangan mengunci nama field pada domain Kimia.
- [ ] Dukung mata pelajaran dengan struktur yang lebih dangkal atau lebih dalam.
- [ ] Setiap entitas memiliki ID stabil, nama, slug, deskripsi, urutan, status, parent, dan metadata.
- [ ] Pisahkan kategori utama dari tag bebas.
- [ ] Dukung alias agar istilah lama tetap dapat ditemukan.
- [ ] Dukung arsip tanpa menghapus relasi historis.
- [ ] Cegah circular parent.
- [ ] Cegah kategori duplikat dalam parent yang sama.

### 5.2 Taxonomy manager

- [ ] Buat halaman atau drawer pengelolaan taxonomy.
- [ ] Tampilkan tree view yang dapat expand/collapse.
- [ ] Sediakan breadcrumb untuk node aktif.
- [ ] Sediakan pencarian node.
- [ ] Sediakan drag-and-drop reorder dengan alternatif keyboard.
- [ ] Sediakan pemindahan node ke parent lain.
- [ ] Tampilkan jumlah materi, soal, ujian, dan kelas yang menggunakan setiap node.
- [ ] Beri warning sebelum memindahkan atau mengarsipkan kategori yang masih digunakan.
- [ ] Sediakan merge kategori duplikat.
- [ ] Sediakan redirect mapping setelah merge.
- [ ] Catat semua perubahan taxonomy pada audit trail.

### 5.3 Taxonomy picker

- [ ] Gunakan cascading picker untuk subject, curriculum, level, topic, dan subtopic.
- [ ] Saring pilihan anak berdasarkan parent yang dipilih.
- [ ] Tampilkan breadcrumb pilihan akhir.
- [ ] Dukung pencarian cepat.
- [ ] Dukung recent selections.
- [ ] Dukung favorite selections untuk admin konten.
- [ ] Bedakan pilihan wajib dan opsional.
- [ ] Jangan menampilkan semua level taxonomy sekaligus jika tidak dibutuhkan.
- [ ] Sediakan tombol clear per level.
- [ ] Tampilkan item archived hanya jika mode khusus diaktifkan.

### 5.4 Data quality taxonomy

- [ ] Buat antrean konten tanpa kategori.
- [ ] Buat antrean konten dengan kategori tidak valid.
- [ ] Deteksi label duplikat.
- [ ] Deteksi penggunaan tag yang terlalu mirip.
- [ ] Tampilkan persentase kelengkapan kategorisasi.
- [ ] Sediakan bulk categorization.
- [ ] Sediakan preview dampak sebelum bulk move.

---

## 6. UMUM — Dashboard Overview

### 6.1 Tujuan halaman

Dashboard adalah halaman pertama setelah admin masuk. Halaman harus memberi overview kondisi publik dan operasional platform tanpa terlalu padat atau terlalu kosong.

### 6.2 Konten utama

- [ ] Header berisi salam kontekstual, tanggal, status data, dan tombol refresh.
- [ ] Tampilkan periode data yang sedang digunakan.
- [ ] Tampilkan last updated.
- [ ] Buat blok Perlu Perhatian di bagian paling atas.
- [ ] Perlu Perhatian mencakup anomali ujian, akun menunggu verifikasi, materi draft lama, soal bermasalah, jadwal konflik, error integrasi, dan kegagalan notifikasi.
- [ ] Setiap item perhatian memiliki jumlah, severity, deskripsi, dan link tindakan.
- [ ] KPI utama maksimal 4–6 metrik.
- [ ] KPI mencakup akun aktif, kelas aktif, sesi ujian, completion rate, engagement, dan health konten sesuai ketersediaan data.
- [ ] Bedakan akun aktif secara administratif dan pengguna aktif berdasarkan waktu.
- [ ] Tampilkan tren singkat dengan konteks pembanding.
- [ ] Tampilkan aktivitas platform 7/30 hari.
- [ ] Tampilkan distribusi civitas secara ringkas.
- [ ] Tampilkan ringkasan kesehatan konten.
- [ ] Tampilkan sesi ujian terbaru.
- [ ] Tampilkan aktivitas admin terbaru.
- [ ] Tampilkan upcoming schedules.
- [ ] Tampilkan system health yang berasal dari pemeriksaan nyata.
- [ ] Sediakan quick action berbasis permission dan kebiasaan admin.

### 6.3 Interaksi dan QoL

- [ ] Klik KPI membuka halaman tujuan dengan filter terkait.
- [ ] Klik alert membuka listing yang sudah terfilter.
- [ ] Pertahankan filter dashboard jika admin kembali dari detail.
- [ ] Sediakan pilihan periode tanpa reload penuh.
- [ ] Gunakan skeleton per section.
- [ ] Background refresh tidak menghilangkan konten lama.
- [ ] Jangan menampilkan chart besar jika data hanya memiliki sedikit titik.

### 6.4 Acceptance criteria

- [ ] Admin dapat mengetahui kondisi platform dalam 10–15 detik.
- [ ] Tidak ada metrik dengan label menyesatkan.
- [ ] Semua alert memiliki tindakan lanjutan.
- [ ] Halaman tetap berguna ketika sebagian koleksi masih kosong.
- [ ] Dashboard nyaman pada lebar 1280px, 1440px, 1920px, tablet, dan mobile.

---

## 7. UMUM — Analitik Umum

### 7.1 Filter dan segmentasi

- [ ] Date range: hari ini, 7 hari, 30 hari, 90 hari, semester, tahun, dan custom.
- [ ] Perbandingan dengan periode sebelumnya.
- [ ] Filter mata pelajaran.
- [ ] Filter kurikulum.
- [ ] Filter jenjang/kelas.
- [ ] Filter sekolah/institusi bila tersedia.
- [ ] Filter role pengguna.
- [ ] Filter status akun.
- [ ] Filter lokasi hanya jika datanya valid dan dibutuhkan.
- [ ] Active filter chips dan reset all.
- [ ] URL menyimpan filter agar analitik dapat dibagikan.

### 7.2 Metrik

- [ ] Registrasi pengguna.
- [ ] Pengguna aktif harian, mingguan, dan bulanan.
- [ ] Activation rate.
- [ ] Retention rate.
- [ ] Jumlah kelas aktif.
- [ ] Aktivitas materi.
- [ ] Jumlah sesi latihan dan ujian.
- [ ] Completion rate.
- [ ] Abandonment rate.
- [ ] Durasi penggunaan.
- [ ] Aktivitas per mata pelajaran.
- [ ] Aktivitas per perangkat bila relevan.

### 7.3 Visualisasi

- [ ] Overview KPI.
- [ ] Time-series pengguna dan aktivitas.
- [ ] Funnel registrasi → aktivasi → bergabung kelas → belajar → ujian selesai.
- [ ] Cohort retention jika data mendukung.
- [ ] Heatmap hari/jam aktivitas.
- [ ] Breakdown per subject dan jenjang.
- [ ] Tabel segmentasi dengan sorting.
- [ ] Anotasi bila ada perubahan sistem yang memengaruhi data.

### 7.4 QoL

- [ ] Tooltip menjelaskan definisi setiap metrik.
- [ ] Export mengikuti filter aktif.
- [ ] Sediakan CSV dan JSON hanya bila sesuai kebutuhan.
- [ ] Tampilkan sample size.
- [ ] Jangan menyimpulkan penyebab hanya berdasarkan korelasi.
- [ ] Tampilkan insufficient data state.

---

## 8. UMUM — Analitik AKURAT Exam

### 8.1 Metrik utama

- [ ] Total exam.
- [ ] Total sesi.
- [ ] Peserta unik.
- [ ] Completion rate.
- [ ] Abandonment rate.
- [ ] Rata-rata durasi.
- [ ] Rata-rata score dan theta.
- [ ] Distribusi proficiency.
- [ ] Anomaly rate.
- [ ] Certificate eligibility rate.

### 8.2 Analisis

- [ ] Performa per domain.
- [ ] Performa per subdomain.
- [ ] Performa per tier path.
- [ ] Performa per tingkat kognitif.
- [ ] Performa per difficulty.
- [ ] Perbandingan cohort.
- [ ] Distribusi waktu pengerjaan.
- [ ] Stage progression.
- [ ] Soal dengan exposure tinggi.
- [ ] Soal dengan correct rate ekstrem.
- [ ] Distractor effectiveness jika data tersedia.
- [ ] Daftar sesi dengan anomaly tertinggi.

### 8.3 Interaksi

- [ ] Klik domain membuka hasil peserta terfilter.
- [ ] Klik anomaly membuka sesi yang relevan.
- [ ] Sediakan compare cohort.
- [ ] Sediakan export berdasarkan filter aktif.
- [ ] Sediakan saved view untuk analis.

---

## 9. DATA CIVITAS — Data Guru

### 9.1 Listing

- [ ] Kolom identitas, email, subject, sekolah, jumlah kelas, jumlah siswa, status, last active, dan tanggal bergabung.
- [ ] Search nama, email, ID, dan sekolah.
- [ ] Filter subject, jenjang, sekolah, status akun, aktivitas, dan tanggal bergabung.
- [ ] Sorting seluruh kolom penting.
- [ ] Column visibility.
- [ ] Density control.
- [ ] Pagination.
- [ ] Row selection dan bulk action.

### 9.2 Detail guru

- [ ] Buka melalui detail drawer atau dedicated detail page.
- [ ] Overview identitas dan status.
- [ ] Mata pelajaran dan scope yang diampu.
- [ ] Daftar kelas.
- [ ] Jumlah siswa.
- [ ] Materi yang dibuat.
- [ ] Soal yang dibuat.
- [ ] Jadwal ujian.
- [ ] Aktivitas terakhir.
- [ ] Riwayat perubahan akun.
- [ ] Warning jika guru memiliki jadwal/kelas aktif.

### 9.3 Aksi

- [ ] Edit profil.
- [ ] Assign subject dan scope.
- [ ] Pindahkan institusi.
- [ ] Aktivasi/nonaktifkan akun.
- [ ] Reset akses/password sesuai sistem autentikasi.
- [ ] Kirim ulang undangan.
- [ ] Lihat sebagai guru dengan banner preview.
- [ ] Export data.
- [ ] Bulk assign subject.
- [ ] Bulk activation.
- [ ] Semua aksi sensitif masuk audit trail.

---

## 10. DATA CIVITAS — Data Siswa

### 10.1 Listing

- [ ] Kolom identitas, kelas, jenjang, sekolah, subject aktif, status, progres, last active, dan tanggal bergabung.
- [ ] Search nama, email, ID, dan kelas.
- [ ] Filter kelas, subject, jenjang, sekolah, status, aktivitas, dan performa.
- [ ] Segmentasi siswa yang membutuhkan perhatian.
- [ ] Bulk selection dan bulk action.

### 10.2 Detail siswa

- [ ] Profil dan status akun.
- [ ] Kelas aktif dan riwayat kelas.
- [ ] Progres materi.
- [ ] Riwayat latihan.
- [ ] Riwayat ujian.
- [ ] Performa per subject/topic.
- [ ] Aktivitas terakhir.
- [ ] Riwayat intervensi.
- [ ] Catatan admin dengan permission.
- [ ] Jangan mengekspos data sensitif di listing.

### 10.3 Aksi

- [ ] Edit profil.
- [ ] Tambah/pindah kelas.
- [ ] Aktivasi/nonaktifkan.
- [ ] Reset akses.
- [ ] Assign materi atau intervensi bila model produk mendukung.
- [ ] Export laporan siswa.
- [ ] Semua perubahan disimpan pada audit trail.

---

## 11. DATA CIVITAS — Data Exam User

### 11.1 Listing dan verifikasi

- [ ] Pisahkan Exam User dari akun siswa reguler.
- [ ] Status: belum diverifikasi, sedang direview, perlu dokumen, valid, ditolak, diblokir.
- [ ] Filter status verifikasi, exam, institusi, tanggal daftar, dan risiko.
- [ ] Search nama, email, participant ID, dan nomor identifikasi yang diizinkan.
- [ ] Buat verification queue.
- [ ] Tampilkan SLA/waktu tunggu verifikasi.

### 11.2 Detail

- [ ] Identitas peserta.
- [ ] Informasi verifikasi.
- [ ] Dokumen hanya untuk role berwenang.
- [ ] Riwayat keputusan verifikasi.
- [ ] Riwayat login dan perangkat bila diizinkan.
- [ ] Riwayat exam.
- [ ] Anomaly flags.
- [ ] Sertifikat.

### 11.3 Aksi

- [ ] Verifikasi.
- [ ] Minta perbaikan data/dokumen.
- [ ] Tolak dengan alasan.
- [ ] Blokir/buka blokir.
- [ ] Assign exam.
- [ ] Kirim ulang instruksi.
- [ ] Semua keputusan memiliki alasan dan audit log.

---

## 12. SEKOLAH — Manajemen Kelas

Referensi dasar: Figma node 259:5142. Referensi tersebut digunakan sebagai dasar visual, kemudian direkonstruksi sesuai kebutuhan operasional lintas mata pelajaran.

### 12.1 Listing kelas

- [ ] Kolom nama kelas, subject, kurikulum, jenjang, guru, jumlah siswa, progres, jadwal terdekat, status, dan last activity.
- [ ] Search nama kelas, kode, guru, subject, dan sekolah.
- [ ] Filter taxonomy bertingkat.
- [ ] Filter status: aktif, belum dimulai, selesai, archived.
- [ ] Filter kelas tanpa guru.
- [ ] Filter kelas tanpa siswa.
- [ ] Filter kelas tidak aktif.
- [ ] Table view sebagai default.
- [ ] Compact card view sebagai opsi.
- [ ] Saved views.

### 12.2 Detail kelas

- [ ] Header identitas kelas dan status.
- [ ] Ringkasan siswa, guru, subject, progres, dan aktivitas.
- [ ] Tab Anggota.
- [ ] Tab Materi.
- [ ] Tab Ujian.
- [ ] Tab Progres.
- [ ] Tab Aktivitas.
- [ ] Tab Pengaturan.
- [ ] Daftar siswa dengan status dan last active.
- [ ] Materi yang ditugaskan.
- [ ] Jadwal dan hasil ujian.
- [ ] Join code dengan regenerate dan expiry.
- [ ] Timeline aktivitas kelas.

### 12.3 Aksi

- [ ] Buat kelas.
- [ ] Edit metadata kelas.
- [ ] Assign/ganti guru.
- [ ] Tambah/pindah/hapus siswa.
- [ ] Assign materi.
- [ ] Jadwalkan ujian.
- [ ] Regenerate join code.
- [ ] Duplicate kelas dengan pilihan data yang disalin.
- [ ] Archive/restore.
- [ ] Export roster.
- [ ] Beri warning dampak sebelum archive.

---

## 13. SEKOLAH — Bank Soal Sekolah

### 13.1 Struktur informasi soal

- [ ] Subject.
- [ ] Curriculum.
- [ ] Grade/level.
- [ ] Unit.
- [ ] Topic.
- [ ] Subtopic.
- [ ] Learning objective.
- [ ] Question type.
- [ ] Difficulty.
- [ ] Cognitive level.
- [ ] Status.
- [ ] Author dan reviewer.
- [ ] Last updated.
- [ ] Usage count.
- [ ] Correct rate.
- [ ] Average response time.

### 13.2 Listing dan preview

- [ ] Gunakan table/list sebagai tampilan kerja utama.
- [ ] Sediakan preview soal di drawer tanpa berpindah halaman.
- [ ] Preview mendukung teks, gambar, rumus, tabel, diagram, dan media.
- [ ] Tampilkan opsi jawaban, kunci, penjelasan, taxonomy, dan statistik.
- [ ] Sediakan next/previous dalam drawer.
- [ ] Pertahankan posisi scroll listing setelah drawer ditutup.
- [ ] Sediakan column manager dan density.

### 13.3 Filter

- [ ] Cascading taxonomy filter.
- [ ] Question type.
- [ ] Difficulty.
- [ ] Cognitive level.
- [ ] Lifecycle status.
- [ ] Quality status.
- [ ] Author.
- [ ] Reviewer.
- [ ] Usage range.
- [ ] Correct-rate range.
- [ ] Last updated.
- [ ] Filter soal belum dikategorikan.
- [ ] Filter soal tanpa penjelasan.

### 13.4 Workflow

- [ ] Status draft → review → revision requested → approved → published → archived.
- [ ] Review queue.
- [ ] Reviewer comment.
- [ ] Version history.
- [ ] Duplicate question.
- [ ] Duplicate detection.
- [ ] Bulk categorize.
- [ ] Bulk assign reviewer.
- [ ] Bulk publish/archive.
- [ ] Import dengan validation report.
- [ ] Export mengikuti filter.
- [ ] Cegah publish jika field wajib belum lengkap.

---

## 14. SEKOLAH — Ujian Sekolah: Jadwal & Sesi

### 14.1 Jadwal

- [ ] List view dan calendar view.
- [ ] Kolom exam, subject, kelas, guru, waktu, durasi, peserta, status, dan kesiapan.
- [ ] Filter tanggal, subject, kelas, guru, status, dan jenis ujian.
- [ ] Upcoming, live, completed, cancelled, dan archived.
- [ ] Deteksi konflik waktu.
- [ ] Deteksi peserta kosong.
- [ ] Deteksi soal tidak cukup.
- [ ] Deteksi konten draft.

### 14.2 Pembuatan jadwal

- [ ] Langkah konteks ujian.
- [ ] Pilih kelas/peserta.
- [ ] Pilih blueprint atau bank soal.
- [ ] Atur aturan ujian.
- [ ] Atur waktu dan durasi.
- [ ] Atur keamanan.
- [ ] Atur notifikasi.
- [ ] Review dan publish.
- [ ] Save as draft.
- [ ] Duplicate jadwal.
- [ ] Checklist kesiapan sebelum publish.

### 14.3 Sesi

- [ ] Tampilkan sesi per jadwal.
- [ ] Status peserta: belum mulai, aktif, disconnect, submit, timeout, flagged.
- [ ] Detail timeline sesi.
- [ ] Perpanjang waktu per peserta atau seluruh sesi.
- [ ] Batalkan/akhiri sesi dengan alasan.
- [ ] Resend access information.
- [ ] Semua tindakan masuk audit trail.

---

## 15. SEKOLAH — Ujian Sekolah: Analitik Hasil

- [ ] Overview skor dan completion.
- [ ] Distribusi nilai.
- [ ] Performa per kelas.
- [ ] Performa per subject/topic/subtopic.
- [ ] Daftar siswa membutuhkan intervensi.
- [ ] Analisis soal paling mudah/sulit.
- [ ] Analisis distractor jika tersedia.
- [ ] Perbandingan antar kelas/periode.
- [ ] Drill-down kelas → siswa → sesi → jawaban.
- [ ] Review dan koreksi hasil dengan permission.
- [ ] Export laporan sesuai filter.
- [ ] Print-friendly report.
- [ ] Tampilkan sample size dan definisi metrik.

---

## 16. SEKOLAH — Materi Belajar

### 16.1 Listing

- [ ] Subject taxonomy yang sama dengan bank soal.
- [ ] Title, topic, author, status, kelas, learner count, completion, dan last updated.
- [ ] Filter taxonomy, status, content type, author, kelas, dan tanggal.
- [ ] Table view dan compact card view.
- [ ] Preview drawer.
- [ ] Saved views.

### 16.2 Content lifecycle

- [ ] Draft.
- [ ] In review.
- [ ] Revision requested.
- [ ] Approved.
- [ ] Published.
- [ ] Archived.
- [ ] Scheduled publish bila diperlukan.
- [ ] Version history.
- [ ] Reviewer comment.

### 16.3 Quality checklist

- [ ] Learning objective.
- [ ] Taxonomy lengkap.
- [ ] Isi materi.
- [ ] Media memiliki alt text.
- [ ] Estimasi durasi.
- [ ] Latihan terkait.
- [ ] Visibility.
- [ ] Mobile preview.
- [ ] Broken link check.
- [ ] Publish validation.

### 16.4 Aksi

- [ ] Buat/edit/duplicate.
- [ ] Assign ke kelas.
- [ ] Bulk categorization.
- [ ] Bulk publish/archive.
- [ ] Preview sebagai siswa.
- [ ] Export/import sesuai kebutuhan.
- [ ] Lihat penggunaan dan progres.

---

## 17. AKURAT EXAM — Exam Live Monitor

### 17.1 Overview live

- [ ] Jumlah exam live.
- [ ] Jumlah peserta online.
- [ ] Peserta belum masuk.
- [ ] Peserta disconnect.
- [ ] Peserta flagged.
- [ ] Sesi hampir habis.
- [ ] Submission error.
- [ ] Status real-time connection.

### 17.2 Daftar exam dan peserta

- [ ] Panel exam aktif.
- [ ] Pilih exam untuk membuka monitor peserta.
- [ ] Search peserta.
- [ ] Filter status peserta.
- [ ] Sort berdasarkan severity.
- [ ] Pin peserta untuk dipantau.
- [ ] Detail peserta melalui drawer.
- [ ] Timeline event peserta.
- [ ] Status koneksi dan last heartbeat.
- [ ] Progress stage/domain.
- [ ] Remaining time.
- [ ] Anomaly flags.

### 17.3 Kontrol operasional

- [ ] Start exam.
- [ ] Pause/resume jika model exam mengizinkan.
- [ ] Extend time.
- [ ] Terminate session.
- [ ] Force submit dengan alasan.
- [ ] Allow reconnect/re-entry.
- [ ] Mark for review.
- [ ] Acknowledge anomaly.
- [ ] Broadcast announcement.
- [ ] Semua tindakan memiliki confirmation dan audit.

### 17.4 Real-time UX

- [ ] Gunakan polling/websocket dengan interval efisien.
- [ ] Update row tanpa mereset scroll.
- [ ] Highlight perubahan status secara singkat.
- [ ] Sediakan pause auto-refresh.
- [ ] Tampilkan last updated.
- [ ] Gunakan suara hanya sebagai opsi pengguna untuk alert kritis.
- [ ] Jangan menggunakan animasi pulse terus-menerus pada banyak elemen.

---

## 18. AKURAT EXAM — Buat Ujian MSAT

### 18.1 Wizard

- [ ] Step 1: identitas dan tujuan exam.
- [ ] Step 2: subject/domain dan blueprint.
- [ ] Step 3: peserta dan eligibility.
- [ ] Step 4: pemilihan soal/tier.
- [ ] Step 5: aturan adaptivity.
- [ ] Step 6: jadwal, durasi, dan keamanan.
- [ ] Step 7: review dan publish.
- [ ] Progress indicator.
- [ ] Save draft otomatis.
- [ ] Back/next tanpa kehilangan data.
- [ ] Resume draft.
- [ ] Sticky summary.
- [ ] Validation per step.
- [ ] Error summary saat publish.

### 18.2 Quality guard

- [ ] Minimum soal per domain/tier.
- [ ] Cakupan taxonomy.
- [ ] Soal belum approved.
- [ ] Duplicate/exposure warning.
- [ ] Participant conflict.
- [ ] Schedule conflict.
- [ ] Capacity warning.
- [ ] Missing certificate rule.
- [ ] Readiness score sebelum publish.
- [ ] Template exam untuk konfigurasi berulang.

---

## 19. AKURAT EXAM — Bank Soal MSAT

- [ ] Filter domain dan subdomain.
- [ ] Filter tier path.
- [ ] Filter difficulty.
- [ ] Filter cognitive level.
- [ ] Filter lifecycle status.
- [ ] Filter calibration status.
- [ ] Tampilkan exposure.
- [ ] Tampilkan correct rate.
- [ ] Tampilkan average response time.
- [ ] Tampilkan penggunaan pada exam.
- [ ] Preview jawaban dan penjelasan.
- [ ] Review workflow.
- [ ] Version history.
- [ ] Bulk categorize/review/archive.
- [ ] Deteksi soal belum siap untuk adaptive exam.
- [ ] Tampilkan dampak sebelum edit soal yang sudah digunakan.
- [ ] pastikan admin mampu mengedit soal dan menambahkan soal

---

## 20. AKURAT EXAM — Skor & Analisis

- [ ] Listing peserta dan hasil.
- [ ] Filter exam, cohort, periode, domain, status, anomaly, dan sertifikasi.
- [ ] Search participant ID, nama, dan email.
- [ ] Score, theta, proficiency, duration, completion, dan anomaly.
- [ ] Detail stage progression.
- [ ] Detail domain performance.
- [ ] Detail respons dan waktu.
- [ ] Strength/weakness summary berdasarkan data.
- [ ] Perbandingan cohort.
- [ ] Review status.
- [ ] Admin note.
- [ ] Export.
- [ ] Print-friendly report.
- [ ] Permission khusus untuk koreksi/manual override.
- [ ] Semua override memiliki alasan dan audit.

---

## 21. AKURAT EXAM — Sertifikat Digital

- [ ] Status eligible, pending review, issued, delivery failed, revoked.
- [ ] Queue penerbitan.
- [ ] Detail peserta dan sumber score.
- [ ] Preview sertifikat.
- [ ] Nomor sertifikat unik.
- [ ] QR/public verification.
- [ ] Minimalisasi data pribadi pada halaman publik.
- [ ] Issue single/bulk.
- [ ] Resend.
- [ ] Download.
- [ ] Revoke dengan alasan.
- [ ] Reissue dengan version history.
- [ ] Template management.
- [ ] Delivery status.
- [ ] Audit seluruh lifecycle sertifikat.

---

## 22. SISTEM — User & Permission

- [ ] Role listing.
- [ ] Permission matrix berdasarkan fitur dan aksi.
- [ ] Scope sekolah/subject/exam.
- [ ] Create custom role jika dibutuhkan.
- [ ] Assign role.
- [ ] Review elevated permission.
- [ ] Warning privilege escalation.
- [ ] Prevent removal of last super admin.
- [ ] Session revocation.
- [ ] Access review report.
- [ ] Semua perubahan permission wajib audit.

---

## 23. SISTEM — Audit Trail

### 23.1 Data log

- [ ] Near-real-time log.
- [ ] Actor.
- [ ] Role.
- [ ] Action.
- [ ] Feature/module.
- [ ] Target type dan target ID.
- [ ] Timestamp.
- [ ] Status success/failure.
- [ ] Reason.
- [ ] Before/after changes yang telah disanitasi.
- [ ] IP/device hanya jika legal dan diperlukan.
- [ ] Correlation/request ID untuk investigasi.

### 23.2 UX

- [ ] Auto-refresh yang dapat dijeda.
- [ ] Filter actor, role, action, feature, target, status, dan date range.
- [ ] Search ID dan nama target.
- [ ] Detail event drawer.
- [ ] Copy event ID.
- [ ] Export sesuai permission.
- [ ] Saved investigation filter.
- [ ] Retention information.
- [ ] Audit log tidak dapat diedit dari UI biasa.

---

## 24. SISTEM — Developer Tools

### 24.1 CLI & Integrasi API

- [ ] Permission gate khusus.
- [ ] Terminal hanya menyediakan command yang diizinkan.
- [ ] Command autocomplete.
- [ ] Command history.
- [ ] Clear output.
- [ ] Copy output.
- [ ] Timestamp dan execution duration.
- [ ] Konfirmasi command berisiko.
- [ ] Redact secret.
- [ ] API key management.
- [ ] Create/revoke/rotate key.
- [ ] Tampilkan key hanya sekali.
- [ ] Scope dan expiry.
- [ ] Webhook management.
- [ ] Delivery log.
- [ ] Retry failed delivery.
- [ ] Test webhook.
- [ ] Dokumentasi endpoint.
- [ ] Rate limit status.

### 24.2 Integrasi Database

- [ ] Status koneksi.
- [ ] Read/write health.
- [ ] Latency.
- [ ] Backup status.
- [ ] Last successful backup.
- [ ] Index status.
- [ ] Migration status.
- [ ] Storage usage.
- [ ] Error summary.
- [ ] Jangan tampilkan credential.
- [ ] Read-only diagnostic sebagai default.
- [ ] Tindakan destructive membutuhkan elevated permission dan confirmation kuat.

---

## 25. SISTEM — Pengaturan Platform

### 25.1 Kategorisasi setting

- [ ] Identitas dan branding.
- [ ] Konfigurasi akademik.
- [ ] Taxonomy default.
- [ ] Authentication.
- [ ] Session dan security.
- [ ] Notification.
- [ ] Exam policy.
- [ ] Certificate policy.
- [ ] Integrations.
- [ ] Data retention.
- [ ] Maintenance mode.
- [ ] Feature flags jika dibutuhkan.

### 25.2 UX pengaturan

- [ ] Section navigation.
- [ ] Search setting.
- [ ] Sticky save bar.
- [ ] Unsaved changes indicator.
- [ ] Reset section.
- [ ] Discard confirmation.
- [ ] Inline validation.
- [ ] Jelaskan dampak setiap setting.
- [ ] Tampilkan setting yang membutuhkan restart/deployment.
- [ ] Permission per section.
- [ ] Audit perubahan before/after.
- [ ] Jangan membuat satu halaman form yang terlalu panjang.

---

## 26. Motion dan Microinteraction

### 26.1 Motion guideline

- [ ] Hover/focus: 100–150ms.
- [ ] Dropdown/popover: 120–180ms.
- [ ] Drawer/modal: 180–240ms.
- [ ] Sidebar collapse: 180–220ms.
- [ ] Page content entrance maksimal 200ms dan tidak wajib pada semua halaman.
- [ ] Gunakan transform dan opacity untuk menjaga performa.
- [ ] Hindari animasi width berat kecuali sidebar yang telah dioptimalkan.
- [ ] Hindari stagger panjang pada daftar/tabel.
- [ ] Hindari infinite animation kecuali progress yang benar-benar aktif.
- [ ] Respect prefers-reduced-motion.

### 26.2 Microinteraction

- [ ] Row hover ringan.
- [ ] Selected row jelas.
- [ ] Active filter transition.
- [ ] Button loading tanpa perubahan ukuran.
- [ ] Toast masuk/keluar halus.
- [ ] Status update highlight singkat.
- [ ] Skeleton shimmer sangat halus atau pulse sederhana.
- [ ] Chart transition hanya saat data berubah.
- [ ] Sidebar tooltip tanpa delay terlalu panjang.
- [ ] Jangan menggunakan bounce, confetti, atau efek dekoratif pada admin operation.

---

## 27. Responsive dan Layout

- [ ] Tetapkan breakpoint berdasarkan kebutuhan konten, bukan hanya device umum.
- [ ] Tabel desktop berubah menjadi horizontal scroll atau priority columns pada layar kecil.
- [ ] Jangan mengubah tabel kompleks menjadi kartu panjang tanpa alasan.
- [ ] Filter desktop menjadi drawer pada mobile.
- [ ] Primary action tetap mudah dicapai.
- [ ] Drawer detail menggunakan full-screen sheet pada mobile.
- [ ] Chart tetap terbaca pada tablet/mobile.
- [ ] Header action dapat wrap tanpa overlap.
- [ ] Uji zoom 200%.
- [ ] Uji teks panjang dan nama pengguna panjang.
- [ ] Uji Bahasa Indonesia dengan label panjang.

---

## 28. Performa

- [ ] Gunakan pagination atau cursor untuk data besar.
- [ ] Gunakan virtualization hanya saat benar-benar dibutuhkan.
- [ ] Debounce search.
- [ ] Cancel stale request.
- [ ] Cache data yang aman.
- [ ] Background revalidation.
- [ ] Hindari refetch seluruh halaman setelah aksi kecil.
- [ ] Lazy-load chart dan editor berat.
- [ ] Hindari library chart yang terlalu besar jika SVG sederhana cukup.
- [ ] Batasi motion pada transform dan opacity.
- [ ] Optimalkan ikon dengan import individual.
- [ ] Audit bundle per halaman.
- [ ] Uji loading pada jaringan lambat.
- [ ] Tampilkan konten lama saat background refresh.
- [ ] Target interaksi utama terasa responsif di perangkat menengah.

---

## 29. Security, Privacy, dan Safety UX

- [ ] Permission dicek di server dan UI.
- [ ] UI disabled bukan pengganti authorization.
- [ ] PII hanya terlihat oleh role yang membutuhkan.
- [ ] Redact secret dan token.
- [ ] Confirmation menampilkan target yang tepat.
- [ ] Destructive bulk action menampilkan jumlah target.
- [ ] Prevent self-lockout.
- [ ] Prevent deleting last admin.
- [ ] Session timeout memiliki warning.
- [ ] Preview mode tidak dapat melakukan tindakan admin tersembunyi.
- [ ] Export sensitif dicatat pada audit.
- [ ] Error tidak membocorkan detail internal.

---

## 30. Testing dan Quality Assurance

### 30.1 Functional

- [ ] Semua link navigasi valid.
- [ ] Semua filter bekerja sendiri dan bersama-sama.
- [ ] Search dan pagination tidak saling mereset.
- [ ] Bulk action bekerja pada selected scope.
- [ ] Drawer/modal dapat dibuka dan ditutup konsisten.
- [ ] Form mempertahankan data saat validasi gagal.
- [ ] Export sesuai filter.
- [ ] Permission state benar.
- [ ] Audit log tercatat.

### 30.2 Visual

- [ ] Tidak ada horizontal overflow yang tidak direncanakan.
- [ ] Tidak ada text clipping.
- [ ] Tidak ada layout shift besar.
- [ ] Spacing konsisten.
- [ ] Status color konsisten.
- [ ] Loading, empty, error, dan success state memiliki kualitas visual setara.
- [ ] Uji resolusi 1280, 1440, 1920, tablet, dan mobile.

### 30.3 Accessibility

- [ ] Keyboard-only test.
- [ ] Screen reader smoke test.
- [ ] Focus trap test.
- [ ] Contrast test.
- [ ] Reduced-motion test.
- [ ] Zoom 200% test.
- [ ] Accessible table header.
- [ ] Accessible chart summary.

### 30.4 Performance

- [ ] TypeScript check.
- [ ] Production build.
- [ ] Lighthouse sebagai indikator tambahan.
- [ ] Bundle inspection.
- [ ] Network request inspection.
- [ ] Large dataset test.
- [ ] Slow network test.
- [ ] Background refresh test.

---

## 31. Urutan Implementasi

### Fase 0 — Audit dan data contract

- [ ] Audit seluruh route admin.
- [ ] Audit seluruh API admin.
- [ ] Audit Firestore collections dan tipe data.
- [ ] Petakan kebutuhan UI terhadap field yang tersedia.
- [ ] Tandai data real, data turunan, data belum tersedia, dan data yang tidak valid.
- [ ] Buat glossary metrik.
- [ ] Buat permission matrix.

### Fase 1 — Fondasi

- [ ] Design tokens.
- [ ] Admin shell.
- [ ] Sidebar collapse/expand.
- [ ] Mobile navigation.
- [ ] Page header.
- [ ] Data table.
- [ ] Filter system.
- [ ] Drawer/modal.
- [ ] Feedback states.
- [ ] Motion primitives.
- [ ] Taxonomy components.

### Fase 2 — Umum

- [ ] Dashboard Overview.
- [ ] Analitik Umum.
- [ ] Analitik AKURAT Exam.

### Fase 3 — Civitas

- [ ] Data Guru.
- [ ] Data Siswa.
- [ ] Data Exam User.
- [ ] User & Permission.

### Fase 4 — Sekolah

- [ ] Manajemen Kelas.
- [ ] Bank Soal Sekolah.
- [ ] Materi Belajar.
- [ ] Jadwal & Sesi.
- [ ] Analitik Hasil.

### Fase 5 — AKURAT Exam

- [ ] Exam Live Monitor.
- [ ] Buat Ujian MSAT.
- [ ] Bank Soal MSAT.
- [ ] Skor & Analisis.
- [ ] Sertifikat Digital.

### Fase 6 — Sistem

- [ ] Audit Trail.
- [ ] CLI & Integrasi API.
- [ ] Integrasi Database.
- [ ] Pengaturan Platform.

### Fase 7 — Final QA

- [ ] Cross-page consistency audit.
- [ ] Permission audit.
- [ ] Accessibility audit.
- [ ] Performance audit.
- [ ] Responsive audit.
- [ ] Error-state audit.
- [ ] Data accuracy audit.
- [ ] Copywriting audit.

---

## 32. Definition of Done per Halaman

Sebuah halaman hanya dianggap selesai jika seluruh poin berikut terpenuhi:

- [ ] Tujuan halaman dan primary user jelas.
- [ ] Data contract terdokumentasi.
- [ ] Semua data yang ditampilkan berasal dari sumber nyata.
- [ ] Information hierarchy telah direview.
- [ ] Primary dan secondary action jelas.
- [ ] Filter, search, sorting, dan pagination bekerja jika relevan.
- [ ] Detail dan drill-down tersedia jika relevan.
- [ ] Loading state selesai.
- [ ] Empty database state selesai.
- [ ] Empty filtered result selesai.
- [ ] Error dan retry state selesai.
- [ ] Permission state selesai.
- [ ] Mobile/tablet/desktop selesai.
- [ ] Keyboard dan focus behavior selesai.
- [ ] Reduced motion selesai.
- [ ] Semua destructive action aman.
- [ ] Audit logging selesai untuk aksi sensitif.
- [ ] TypeScript lolos.
- [ ] Production build lolos.
- [ ] Tidak menambah regresi pada halaman lain.
- [ ] UI tidak mengandung placeholder, angka palsu, tombol mati, atau aksi tanpa feedback.

---

## 33. Anti AI-Slop Checklist

- [ ] Tidak ada headline pemasaran di halaman operasional.
- [ ] Tidak ada gradient dekoratif tanpa fungsi.
- [ ] Tidak ada kumpulan kartu identik hanya untuk mengisi ruang.
- [ ] Tidak ada ikon acak untuk setiap label.
- [ ] Tidak ada copy generik seperti “unlock insights” atau “powerful analytics”.
- [ ] Tidak ada chart tanpa keputusan yang dapat diambil.
- [ ] Tidak ada fake system status.
- [ ] Tidak ada angka dummy.
- [ ] Tidak ada floating element yang menghalangi tabel.
- [ ] Tidak ada animasi berulang yang mengganggu.
- [ ] Tidak ada terlalu banyak pill dan badge.
- [ ] Tidak ada radius besar pada semua komponen.
- [ ] Tidak ada shadow berat dan glow berlebihan.
- [ ] Tidak ada informasi yang hanya dapat ditemukan melalui hover.
- [ ] Tidak ada action penting yang disembunyikan dalam menu tanpa alasan.
- [ ] Tidak ada istilah teknis tanpa penjelasan.
- [ ] Tidak ada layout yang memprioritaskan dekorasi di atas keterbacaan data.

---

## 34. Catatan Referensi Figma

- File: Chemora — Chemistry E-Learning.
- Node kelas: 259:5142.
- Figma digunakan sebagai referensi struktur dan bahasa visual awal.
- Setiap layar tetap harus disesuaikan dengan data nyata, permission, taxonomy lintas mata pelajaran, kebutuhan operasional, responsive behavior, accessibility, dan performa aplikasi AKURAT.
