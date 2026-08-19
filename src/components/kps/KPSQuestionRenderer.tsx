'use client';

import { FC } from 'react';
import { KPSQuestionClient, KPSMultipleChoice, KPSComplexMC, KPSTrueFalse, KPSComplexTF, KPSMatching } from '@/types/kps';
import { KPSMultipleChoice as KPSMCComponent } from './KPSMultipleChoice';
import { KPSTrueFalse as KPSTFComponent } from './KPSTrueFalse';
import { KPSComplexMC as KPSCMCComponent } from './KPSComplexMC';
import { KPSComplexTF as KPSCTFComponent } from './KPSComplexTF';
import { KPSMatching as KPSMComponent } from './KPSMatching';

interface KPSQuestionRendererProps {
  question: KPSQuestionClient;
  currentAnswer: Record<string, unknown> | null;
  onAnswer: (answer: Record<string, unknown>) => void;
  disabled?: boolean;
}

export const KPSQuestionRenderer: FC<KPSQuestionRendererProps> = ({
  question,
  currentAnswer,
  onAnswer,
  disabled,
}) => {
  const q = question as unknown as { id: string; questionType: string };

  switch (question.questionType) {
    case 'multiple_choice':
      return (
        <KPSMCComponent
          question={question as unknown as KPSMultipleChoice & { id: string }}
          selectedAnswer={currentAnswer?.selectedAnswer as string | null}
          onSelect={(answer) => onAnswer({ selectedAnswer: answer })}
          disabled={disabled}
        />
      );
    case 'complex_multiple_choice':
      return (
        <KPSCMCComponent
          question={question as unknown as KPSComplexMC & { id: string }}
          selectedAnswers={currentAnswer?.selectedAnswers as string[] || []}
          onSelect={(answers) => onAnswer({ selectedAnswers: answers })}
          disabled={disabled}
        />
      );
    case 'true_false':
      return (
        <KPSTFComponent
          question={question as unknown as KPSTrueFalse & { id: string }}
          selectedAnswer={currentAnswer?.booleanAnswer as boolean | null}
          onSelect={(answer) => onAnswer({ booleanAnswer: answer })}
          disabled={disabled}
        />
      );
    case 'complex_true_false':
      return (
        <KPSCTFComponent
          question={question as unknown as KPSComplexTF & { id: string }}
          answers={currentAnswer?.booleanAnswers as Record<string, boolean> || {}}
          onSelect={(answers) => onAnswer({ booleanAnswers: answers })}
          disabled={disabled}
        />
      );
    case 'matching':
      return (
        <KPSMComponent
          question={question as unknown as KPSMatching & { id: string }}
          matches={currentAnswer?.matchedPairs as Record<string, string> || {}}
          onSelect={(matches) => onAnswer({ matchedPairs: matches })}
          disabled={disabled}
        />
      );
    default:
      return <div className="text-red-500">Tipe soal tidak dikenali: {q.questionType}</div>;
  }
};
