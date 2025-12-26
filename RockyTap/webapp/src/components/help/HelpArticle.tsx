import { Card, CardContent, CardHeader, CardTitle, Button } from '../ui';
import { HelpArticle as HelpArticleType } from '../../api/client';
import styles from './HelpArticle.module.css';

interface HelpArticleProps {
  article: HelpArticleType;
  onBack: () => void;
}

export function HelpArticle({ article, onBack }: HelpArticleProps) {
  return (
    <div className={styles.container}>
      <Card variant="elevated">
        <CardHeader>
          <div className={styles.articleHeader}>
            <div>
              <span className={styles.category}>{article.category}</span>
              <CardTitle>{article.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
          
          {article.related_articles && article.related_articles.length > 0 && (
            <div className={styles.relatedSection}>
              <h4 className={styles.relatedTitle}>Related Articles</h4>
              <ul className={styles.relatedList}>
                {article.related_articles.map((relatedId) => (
                  <li key={relatedId} className={styles.relatedItem}>
                    <a href={`#article-${relatedId}`} className={styles.relatedLink}>
                      Article #{relatedId}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className={styles.actions}>
        <Button fullWidth variant="outline" onClick={onBack}>
          Back to Help Center
        </Button>
      </div>
    </div>
  );
}

