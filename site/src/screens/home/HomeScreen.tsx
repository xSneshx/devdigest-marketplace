import { useSiteIndex } from '../../lib/index-context';
import { hasKeywords, topKeywords, visibleKinds } from '../../lib/facets';
import { EmptyCatalog } from './_components/EmptyCatalog';
import { Footer } from './_components/Footer';
import { Hero } from './_components/Hero';
import { KindSections } from './_components/KindSections';
import { LatestReleases } from './_components/LatestReleases';
import styles from './HomeScreen.module.css';

const KEYWORD_CHIPS = 7;

export function HomeScreen() {
  const index = useSiteIndex();
  if (index.plugins.length === 0) return <EmptyCatalog repo={index.meta.repo} />;

  const keywords = hasKeywords(index) ? topKeywords(index, KEYWORD_CHIPS) : [];
  return (
    <div className={styles.root}>
      <Hero marketplaceName={index.meta.marketplaceName} keywords={keywords} />
      <KindSections index={index} kinds={visibleKinds(index)} />
      <LatestReleases index={index} />
      <Footer index={index} />
    </div>
  );
}
