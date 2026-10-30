import Breadcrumbs from './Breadcrumbs';

export default function PageHeader({ title, breadcrumbs = [] }) {
  return (
    <div className="border-b border-line pb-8 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} className="mb-3" />}
        <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">{title}</h1>
      </div>
    </div>
  );
}
