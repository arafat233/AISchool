import { Injectable } from "@nestjs/common";

interface GradeRange { label: string; minPercent: number; maxPercent: number; points?: number }
interface GradingConfig { scale: string; passingPercentage: number; grades: unknown }

// Default CBSE grading scale
const CBSE_GRADES: GradeRange[] = [
  { label: "A1", minPercent: 91, maxPercent: 100, points: 10 },
  { label: "A2", minPercent: 81, maxPercent: 90,  points: 9  },
  { label: "B1", minPercent: 71, maxPercent: 80,  points: 8  },
  { label: "B2", minPercent: 61, maxPercent: 70,  points: 7  },
  { label: "C1", minPercent: 51, maxPercent: 60,  points: 6  },
  { label: "C2", minPercent: 41, maxPercent: 50,  points: 5  },
  { label: "D",  minPercent: 33, maxPercent: 40,  points: 4  },
  { label: "E",  minPercent: 0,  maxPercent: 32,  points: 0  },
];

const ICSE_GRADES: GradeRange[] = [
  { label: "A+", minPercent: 90, maxPercent: 100 },
  { label: "A",  minPercent: 75, maxPercent: 89  },
  { label: "B+", minPercent: 60, maxPercent: 74  },
  { label: "B",  minPercent: 50, maxPercent: 59  },
  { label: "C",  minPercent: 40, maxPercent: 49  },
  { label: "D",  minPercent: 33, maxPercent: 39  },
  { label: "F",  minPercent: 0,  maxPercent: 32  },
];

const DISTINCTION_PASS_GRADES: GradeRange[] = [
  { label: "Distinction", minPercent: 75, maxPercent: 100 },
  { label: "First Class",  minPercent: 60, maxPercent: 74  },
  { label: "Second Class", minPercent: 50, maxPercent: 59  },
  { label: "Pass",         minPercent: 35, maxPercent: 49  },
  { label: "Fail",         minPercent: 0,  maxPercent: 34  },
];

@Injectable()
export class GradingService {
  getGrade(percentage: number, config: GradingConfig | null): string {
    let grades: GradeRange[];

    if (!config) {
      grades = CBSE_GRADES;
    } else if (config.scale === "ICSE") {
      grades = ICSE_GRADES;
    } else if (config.scale === "DISTINCTION_PASS") {
      grades = DISTINCTION_PASS_GRADES;
    } else if (config.scale === "CUSTOM" && Array.isArray(config.grades)) {
      grades = config.grades as GradeRange[];
    } else {
      grades = CBSE_GRADES;
    }

    const match = grades.find((g) => percentage >= g.minPercent && percentage <= g.maxPercent);
    return match?.label ?? "N/A";
  }

  getGradePoints(percentage: number, config: GradingConfig | null): number {
    let grades: GradeRange[];
    if (!config || config.scale === "CBSE") {
      grades = CBSE_GRADES;
    } else if (Array.isArray(config.grades)) {
      grades = config.grades as GradeRange[];
    } else {
      grades = CBSE_GRADES;
    }
    const match = grades.find((g) => percentage >= g.minPercent && percentage <= g.maxPercent);
    return match?.points ?? 0;
  }

  calculateCGPA(gradePoints: number[]): number {
    if (!gradePoints.length) return 0;
    const sum = gradePoints.reduce((a, b) => a + b, 0);
    return +(sum / gradePoints.length).toFixed(2);
  }
}
