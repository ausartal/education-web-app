import { FC } from 'react';
import Link from 'next/link';
import { BookOpen, PenTool, GraduationCap, MessageCircle } from 'lucide-react';

const actions = [
  {
    href: '/materi',
    label: 'Lanjut Belajar',
    icon: BookOpen,
    color: 'bg-blue-50 text-primary',
  },
  {
    href: '/latihan',
    label: 'Latihan Quiz',
    icon: PenTool,
    color: 'bg-green-50 text-success',
  },
  {
    href: '/ujian',
    label: 'Mulai Ujian',
    icon: GraduationCap,
    color: 'bg-purple-50 text-[#8B5CF6]',
  },
  {
    href: '/messages',
    label: 'Tanya Guru',
    icon: MessageCircle,
    color: 'bg-orange-50 text-primary-orange',
  },
];

export const QuickActions: FC = () => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}
            >
              <Icon size={20} />
            </div>
            <span className="text-sm font-medium text-gray-800">
              {action.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};
