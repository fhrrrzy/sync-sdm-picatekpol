import axios from 'axios';
import mysql from 'mysql2/promise';
import cron from 'node-cron';
import https from 'https';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';


// Koneksi ke MySQL
const dbConfig = {
  host: '103.152.5.77',
  user: 'u344419611_picatekpol',
  password: 'Picatekpol2024!@#',
  database: 'u344419611_picatekpol',
  port: '13036',
  connectTimeout: 20000
};

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1407258593161379850/Uiy7O1-j-ekohed3V_R9fK9LynhWpwzI9une-IyIz53Y0St0KxzKoyT7tcuwiWXJKw6y';

const argv = yargs(hideBin(process.argv))
  .option('start', { alias: 's', type: 'string', description: 'Tanggal mulai sinkronisasi (YYYY-MM-DD)' })
  .option('end', { alias: 'e', type: 'string', description: 'Tanggal akhir sinkronisasi (YYYY-MM-DD)' })
  .option('daemon', { alias: 'd', type: 'boolean', description: 'Jalankan mode daemon (cron tiap 30 menit)', default: false })
  .help()
  .argv;

async function main(tglAwal, tglAkhir) {
  await executeSinkronisasiKehadiran(tglAwal, tglAkhir);
}

async function executeSinkronisasiKehadiran(tglAwal, tglAkhir) {
  const url = `https://digital-farming.holding-perkebunan.com/api/getpresensi/daterange?startDate=${tglAwal}&endDate=${tglAkhir}`;
  let conn;
  const startTime = new Date();

  try {
    const response = await axios.get(url, {
      headers: { Authorization: 'w0cC53x7uzvghWiKbvwit8YqimwaUE3z', Accept: 'application/json' },
      timeout: 120000, 
      httpsAgent: new https.Agent({  rejectUnauthorized: false, keepAlive: true  })
    });

    const body = response.data;
    if (!body || !body.data) {
      console.error('Response tidak sesuai format');
      return { success: false, startTime, endTime: new Date(), sukses: 0, gagal: 0 };
    }

    const data = body.data;
    conn = await mysql.createConnection(dbConfig);
    let sukses = 0, gagal = 0;

    for (const [i, row] of data.entries()) {
      try {
        let kode_unit_unik = row.kode_unit_kerja_sap;

        const [cekPpis] = await conn.query(
          `SELECT 1 FROM karyawan WHERE sap = ? AND LOWER(pabrik) LIKE '%ppis%' LIMIT 1`,
          [row.nik_sap]
        );
        if (cekPpis.length > 0) kode_unit_unik = `X-${row.kode_unit_kerja_sap}`;

        await conn.query(
          `DELETE FROM sdm_kehadiran 
            WHERE nik_sap = ? 
            AND tanggal_presensi = ? 
            AND CONVERT_TZ(updated_at, '+00:00', '+07:00') < (CONVERT_TZ(NOW(), '+00:00', '+07:00') - INTERVAL 3 HOUR);
        `,
          [row.nik_sap, row.tanggal_presensi]
        );

        await conn.query(
          `INSERT INTO sdm_kehadiran (
            perusahaan, nama_regional, kode_unit_kerja_sap, nama_unit_kerja, bagian_divisi,
            nik_sap, nama, jabatan, tanggal_presensi, waktu_check_in, waktu_check_out,
            jenis_presensi, sumber_data, latitude, longitude, status, komoditas,
            nik_pencatat, nama_pencatat, jabatan_pencatat, desc_org_unit, kode_unit_unik
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            perusahaan=VALUES(perusahaan), nama_regional=VALUES(nama_regional),
            kode_unit_kerja_sap=VALUES(kode_unit_kerja_sap), nama_unit_kerja=VALUES(nama_unit_kerja),
            bagian_divisi=VALUES(bagian_divisi), nama=VALUES(nama), jabatan=VALUES(jabatan),
            waktu_check_in=VALUES(waktu_check_in), waktu_check_out=VALUES(waktu_check_out),
            jenis_presensi=VALUES(jenis_presensi), sumber_data=VALUES(sumber_data),
            latitude=VALUES(latitude), longitude=VALUES(longitude), status=VALUES(status),
            komoditas=VALUES(komoditas), nik_pencatat=VALUES(nik_pencatat),
            nama_pencatat=VALUES(nama_pencatat), jabatan_pencatat=VALUES(jabatan_pencatat),
            desc_org_unit=VALUES(desc_org_unit), kode_unit_unik=VALUES(kode_unit_unik)`,
          [
            row.perusahaan, row.nama_regional, row.kode_unit_kerja_sap, row.nama_unit_kerja,
            row.bagian_divisi, row.nik_sap, row.nama, row.jabatan, row.tanggal_presensi || null,
            row.waktu_check_in || null, row.waktu_check_out || null, row.jenis_presensi,
            row.sumber_data, row.latitude || null, row.longitude || null, row.status,
            row.komoditas, row.nik_pencatat, row.nama_pencatat, row.jabatan_pencatat,
            row.desc_org_unit, kode_unit_unik
          ]
        );

        sukses++;
      } catch (rowErr) {
        gagal++;
        console.error(`⚠️ Error row ke-${i + 1}: nik_sap=${row.nik_sap || 'NULL'}`);
        console.error('➡️ Pesan error:', rowErr.message);
      }

      process.stdout.write(`\rProgress: ${i + 1}/${data.length} | Sukses: ${sukses} | Gagal: ${gagal}`);
    }

    const endTime = new Date();
    console.log('\n✅ Sinkronisasi selesai');
    return { success: true, startTime, endTime, total: data.length, sukses, gagal };

  } catch (err) {
    console.error(`❌ Error sinkronisasi (${tglAwal} s/d ${tglAkhir}):`, err.message);
    console.error(err);
    return { success: false, startTime, endTime: new Date(), sukses: 0, gagal: 0 };
  } finally {
    if (conn) await conn.end();
  }
}

// --------------------------
// Sinkronisasi Otomatis 3 Hari
// --------------------------
async function executeSinkronisasiOtomatisHarian() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 2);
  const formatDate = d => d.toISOString().split('T')[0];
  const tglAwal = formatDate(start);
  const tglAkhir = formatDate(today);

  console.log(`⏳ Sinkronisasi untuk range ${tglAwal} s/d ${tglAkhir} ...`);
  const overallStartTime = new Date();
  const result = await executeSinkronisasiKehadiran(tglAwal, tglAkhir);
  const overallEndTime = new Date();

  return {
    tglAwal, tglAkhir,
    totalRows: result.total,
    successfulInserts: result.sukses,
    failedInserts: result.gagal,
    overallStartTime,
    overallEndTime,
    status: result.success ? 'success' : 'fail'
  };
}

// --------------------------
// Kirim Notif Discord
// --------------------------
async function kirimNotifDiscord({ tglAwal, tglAkhir, totalRows, successfulInserts, failedInserts, overallStartTime, overallEndTime, status = 'success' }) {
  try {
    const color = status === 'success' ? 0x2ecc71 : 0xe74c3c;

    await axios.post(DISCORD_WEBHOOK_URL, {
      embeds: [{
        title: `🔄 Presensi Sync Summary - ${getTanggalJam()}`,
        description: `Data presensi berhasil disinkronisasi`,
        color,
        fields: [
          { name: '📅 Date Range', value: `${tglAwal} to ${tglAkhir}`, inline: true },
          { name: '📊 Total Rows', value: `${totalRows}`, inline: true },
          { name: '✅ Successful Inserts', value: `${successfulInserts}`, inline: true },
          { name: '❌ Failed Inserts', value: `${failedInserts}`, inline: true },
          { name: '⏱ Start Time', value: `${overallStartTime.toLocaleString("id-ID")}`, inline: true },
          { name: '⏱ End Time', value: `${overallEndTime.toLocaleString("id-ID")}`, inline: true }
        ],
        footer: { text: `Sync completed at ${getTanggalJam()}` },
        timestamp: new Date().toISOString()
      }]
    });

    console.log("✅ Notifikasi embed terkirim ke Discord");
  } catch (error) {
    console.error("❌ Gagal kirim notifikasi embed ke Discord:", error.message);
  }
}

function getTanggalJam() {
  const now = new Date();
  return now.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

// --------------------------
// Eksekusi sesuai argumen
// --------------------------
if (argv.daemon) {
  console.log('🟢 Menjalankan mode daemon (cron tiap 30 menit, default 3 hari kebelakang)...');
  cron.schedule('*/30 * * * *', async () => {
    console.log('⏳ Menjalankan sinkronisasi otomatis tiap 30 menit...');
    try {
      const summary = await executeSinkronisasiOtomatisHarian();
      await kirimNotifDiscord(summary);
    } catch (err) {
      console.error("❌ Error sinkronisasi otomatis:", err.message);
      await kirimNotifDiscord({
        tglAwal: '-', tglAkhir: '-', totalRows: '-', successfulInserts: '-', failedInserts: '-',
        overallStartTime: '-', overallEndTime: '-', status: 'fail'
      });
    }
  });
} else if (argv.start && argv.end) {
  console.log(`🟢 Menjalankan sinkronisasi dari ${argv.start} sampai ${argv.end}...`);
  (async () => {
    try {
      await main(argv.start, argv.end);
    } catch (err) {
      console.error('❌ Error sinkronisasi:', err.message);
    }
  })();
} else {
  console.log('⚠️ Harap gunakan argumen: --start YYYY-MM-DD --end YYYY-MM-DD atau --daemon');
}
