import { FC } from 'react';
import Image from 'next/image';

const topics = [
  {
    name: 'Compound',
    description: 'Substances consisting of 2+ elements',
    icon: '/images/topic-compound.png',
  },
  {
    name: 'Atom',
    description: 'The smallest building of matter',
    icon: '/images/topic-atom.png',
  },
  {
    name: 'Periodic Table',
    description: 'A map that organizes all elements',
    icon: '/images/topic-periodic-table.png',
  },
  {
    name: 'Mol',
    description: 'Unit for counting the number of particles',
    icon: '/images/topic-mol.png',
  },
  {
    name: 'Chemical Reaction',
    description: 'Symbolic changes in substances in reactions',
    icon: '/images/topic-chemical-reaction.png',
  },
  {
    name: 'Stoichiometry',
    description: '"Calculating" in chemical reactions',
    icon: '/images/topic-stoichiometry.png',
  },
  {
    name: 'Solution',
    description: 'A mixture of solute and solvent',
    icon: '/images/topic-solution.png',
  },
];

export const LearningMaterialSection: FC = () => {
  return (
    <section id="learning-material" className="px-4 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-3 text-center font-display text-3xl text-gray-900 lg:text-4xl">
          Chemistry Materials We Teach
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-gray-500">
          Here, we offer a variety of chemistry materials designed for all
          levels, from beginner to advanced. Our material covers a variety of
          fundamental topics in chemistry.
        </p>

        {/* Topic Cards - Horizontal scroll on mobile, grid on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
          {topics.slice(0, 4).map((topic) => (
            <div
              key={topic.name}
              className="flex min-w-[200px] flex-shrink-0 items-center gap-3 rounded-xl bg-gray-50 px-4 py-4 lg:min-w-0"
            >
              <Image src={topic.icon} alt={topic.name} width={48} height={48} />
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {topic.name}
                </h3>
                <p className="text-xs text-gray-500">{topic.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          {topics.slice(4).map((topic) => (
            <div
              key={topic.name}
              className="flex min-w-[220px] flex-shrink-0 items-center gap-3 rounded-xl bg-gray-50 px-4 py-4 lg:min-w-0"
            >
              <Image src={topic.icon} alt={topic.name} width={48} height={48} />
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {topic.name}
                </h3>
                <p className="text-xs text-gray-500">{topic.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
