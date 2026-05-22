import { FC } from 'react';
import Link from 'next/link';
import { CheckCircle, Clock, Lock } from 'lucide-react';
import { Material, UserProgress } from '@/types/firestore';

interface LearningPathProps {
  materials: Material[];
  progress: UserProgress[];
}

export const LearningPath: FC<LearningPathProps> = ({
  materials,
  progress,
}) => {
  const getStatus = (materialId: string) => {
    const p = progress.find((pr) => pr.materialId === materialId);
    return p?.status || 'not_started';
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Learning Path</h2>
        <Link
          href="/materi"
          className="text-sm font-medium text-primary hover:underline"
        >
          Lihat Semua
        </Link>
      </div>

      <div className="space-y-3">
        {materials.slice(0, 5).map((material, i) => {
          const status = getStatus(material.id);
          const isCompleted = status === 'completed';
          const isInProgress = status === 'in_progress';
          const isLocked =
            i > 0 &&
            getStatus(materials[i - 1].id) === 'not_started' &&
            status === 'not_started';

          return (
            <Link
              key={material.id}
              href={isLocked ? '#' : `/materi/${material.id}`}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                isLocked
                  ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-60'
                  : 'border-gray-100 bg-white hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              {/* Status Icon */}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isCompleted
                    ? 'bg-success-light text-success'
                    : isInProgress
                      ? 'bg-blue-50 text-primary'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle size={20} />
                ) : isLocked ? (
                  <Lock size={18} />
                ) : (
                  <Clock size={18} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  {material.title}
                </h3>
                <p className="text-xs text-gray-500">{material.description}</p>
              </div>

              {/* Duration */}
              <span className="hidden text-xs text-gray-400 sm:block">
                {material.estimatedTime} min
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
