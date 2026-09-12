import {
  ProblemType,
  ImpactMetricType,
  ImpactTimeBasis,
  ImpactVerificationStatus,
  AdaptiveQuestionDto,
} from '@sicp/shared';
import { IImpactModel, ImpactEvaluationContext, ImpactEvaluationResult } from '../impact.types';

export class EducationServiceImpactModel implements IImpactModel {
  public readonly problemType = ProblemType.EDUCATION_SERVICE;
  public readonly defaultMetricType = ImpactMetricType.AFFECTED_STUDENTS;
  public readonly defaultUnit = 'STUDENTS';
  public readonly defaultTimeBasis = ImpactTimeBasis.TOTAL_EXPOSURE;

  public getAdaptiveQuestions(): AdaptiveQuestionDto[] {
    return [
      {
        id: 'enrolledStudents',
        prompt: 'How many total students are currently enrolled in this educational institution?',
        placeholder: 'e.g. 420',
        inputType: 'number',
        unit: 'STUDENTS',
      },
      {
        id: 'schoolClosureFull',
        prompt: 'Is the school entirely closed due to this issue, or only specific classrooms/facilities?',
        inputType: 'boolean',
      },
      {
        id: 'affectedClassrooms',
        prompt: 'If partially affected, how many classrooms or labs are unusable?',
        placeholder: 'e.g. 4',
        inputType: 'number',
      },
      {
        id: 'boardExamBatch',
        prompt: 'Does this disruption directly affect students preparing for board or public examinations?',
        inputType: 'boolean',
      },
    ];
  }

  public evaluate(
    inputs: Record<string, unknown>,
    context: ImpactEvaluationContext
  ): ImpactEvaluationResult {
    const enrolledStudents = Number(inputs.enrolledStudents) || 0;
    const isSchoolClosed = Boolean(inputs.schoolClosureFull);
    const affectedClassrooms = Number(inputs.affectedClassrooms) || 0;
    const totalClassrooms = Number(inputs.totalClassrooms) || (affectedClassrooms > 0 ? affectedClassrooms + 2 : 6);
    const boardExamBatch = Boolean(inputs.boardExamBatch);

    const evidenceBasis: string[] = [];
    const dataSources: string[] = [];
    const missingInformation: string[] = [];

    let value = 0;
    let calculationMethod = '';
    let confidence = 0.5;

    if (enrolledStudents > 0) {
      if (isSchoolClosed || affectedClassrooms === 0) {
        value = enrolledStudents;
        calculationMethod = 'TOTAL_ENROLLED_STUDENT_CENSUS';
        evidenceBasis.push(`Entire enrolled student body (${enrolledStudents}) directly affected by schoolwide disruption`);
      } else {
        const ratio = Math.min(1.0, affectedClassrooms / Math.max(1, totalClassrooms));
        value = Math.round(enrolledStudents * ratio);
        calculationMethod = 'CLASSROOM_PROPORTION_STUDENT_PRODUCT';
        evidenceBasis.push(`${enrolledStudents} students × ${affectedClassrooms}/${totalClassrooms} unusable classrooms`);
      }
      dataSources.push('School enrollment roll / submitter report');
      confidence = 0.85;
    } else {
      value = 280; // Standard government primary/middle school enrollment benchmark
      calculationMethod = 'GOVERNMENT_SCHOOL_STANDARD_ENROLLMENT';
      evidenceBasis.push('National benchmark for rural public school enrollment applied');
      dataSources.push('UDISE+ public school enrollment statistics');
      missingInformation.push('Exact student enrollment count not supplied');
      confidence = 0.45;
    }

    if (inputs.schoolClosureFull === undefined) {
      missingInformation.push('Degree of campus closure (total vs partial facility) not confirmed');
    }

    // Normalization into 0–100 magnitude score
    let magnitude = Math.min(100, Math.round(13.5 * Math.log(1 + value)));
    if (boardExamBatch) {
      magnitude = Math.min(100, magnitude + 10); // Board examination disruption penalty
    }
    if (isSchoolClosed) {
      magnitude = Math.min(100, magnitude + 8); // Complete campus shutdown penalty
    }

    const explanation = `Estimated ${value.toLocaleString()} students directly deprived of educational access (${calculationMethod}). Campus closure: ${isSchoolClosed ? 'Total' : 'Partial'}. Board exam impact: ${boardExamBatch ? 'Yes' : 'No'}.`;

    return {
      problemType: this.problemType,
      metricType: this.defaultMetricType,
      value,
      unit: this.defaultUnit,
      timeBasis: this.defaultTimeBasis,
      calculationMethod,
      inputs: {
        enrolledStudents: enrolledStudents || null,
        schoolClosureFull: isSchoolClosed,
        affectedClassrooms: affectedClassrooms || null,
        totalClassrooms,
        boardExamBatch,
      },
      confidence,
      evidenceBasis,
      dataSources,
      verificationStatus: enrolledStudents > 0 ? ImpactVerificationStatus.ESTIMATED : ImpactVerificationStatus.REPORTED,
      normalizedMagnitude: magnitude,
      missingInformation,
      suggestedQuestions: this.getAdaptiveQuestions(),
      requiresHumanReview: confidence < 0.6 || isSchoolClosed,
      explanation,
    };
  }
}
