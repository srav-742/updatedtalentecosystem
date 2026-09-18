const mongoose = require('mongoose');

const uri = 'mongodb+srv://Nexhire:Sravya%407624@cluster0.17ifydh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function syncBackupScores() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);

  const dbBackup = mongoose.connection.useDb('talentechosystem_backup');
  const dbLive = mongoose.connection.useDb('talentechosystem');

  const bApps = await dbBackup.collection('applications').find({}).toArray();
  const lApps = await dbLive.collection('applications').find({}).toArray();

  console.log(`Found ${bApps.length} backup applications and ${lApps.length} live applications.`);

  let updatedCount = 0;
  let untouchedCount = 0;

  for (const b of bApps) {
    const l = lApps.find(x => x._id.toString() === b._id.toString());
    if (!l) {
      console.log(`[SKIPPED] Backup app ${b._id} (${b.applicantName}) not found in live DB.`);
      continue;
    }

    const backupPenalty = b.integrityPenalty !== undefined && b.integrityPenalty !== null ? b.integrityPenalty : 0;
    const backupScore = b.proctoringScore !== undefined && b.proctoringScore !== null ? b.proctoringScore : 0;

    // Check if update is needed
    if (l.integrityPenalty !== backupPenalty || l.proctoringScore !== backupScore) {
      const updateFields = {
        integrityPenalty: backupPenalty,
        proctoringScore: backupScore,
      };
      if (b.proctoringResetCount !== undefined) {
        updateFields.proctoringResetCount = b.proctoringResetCount;
      }
      if (b.lastProctoringViolation !== undefined) {
        updateFields.lastProctoringViolation = b.lastProctoringViolation;
      }

      await dbLive.collection('applications').updateOne(
        { _id: l._id },
        { $set: updateFields }
      );

      updatedCount++;
      console.log(`[UPDATED ${updatedCount}] ${b.applicantName} (${b._id}):`);
      console.log(`  integrityPenalty: ${l.integrityPenalty} -> ${backupPenalty}`);
      console.log(`  proctoringScore:  ${l.proctoringScore} -> ${backupScore}`);
      console.log(`  finalScore (kept untouched): ${l.finalScore}`);
    } else {
      untouchedCount++;
    }
  }

  console.log('\n=======================================');
  console.log(`Sync complete!`);
  console.log(`Updated applications: ${updatedCount}`);
  console.log(`Already up-to-date:    ${untouchedCount}`);
  console.log('=======================================');

  process.exit(0);
}

syncBackupScores().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
