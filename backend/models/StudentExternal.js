import mongoose from 'mongoose';

const studentExternalSchema = new mongoose.Schema({
  student_id: { type: String, required: true, index: true, unique: true },
  sourceIds: {
    profileId: { type: String },
    attendanceStudentId: { type: String },
    assignmentsStudentId: { type: String },
    examStudentId: { type: String },
    enrollmentStudentId: { type: String },
    examIds: [{ type: String }]
  },
  profile: { type: mongoose.Schema.Types.Mixed },
  attendanceSummaryMonthly: { type: mongoose.Schema.Types.Mixed },
  attendanceDetails: { type: mongoose.Schema.Types.Mixed },
  assignments: { type: mongoose.Schema.Types.Mixed },
  examList: { type: mongoose.Schema.Types.Mixed },
  examDataByExamId: { type: Map, of: mongoose.Schema.Types.Mixed },
  enrollment: { type: mongoose.Schema.Types.Mixed },
  updatedAt: { type: Date, default: Date.now }
});

studentExternalSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const StudentExternal = mongoose.model('StudentExternal', studentExternalSchema);

export default StudentExternal;


