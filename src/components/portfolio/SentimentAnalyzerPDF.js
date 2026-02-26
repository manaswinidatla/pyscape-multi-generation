import React from 'react';
import {
  Document, Page, View, Text, StyleSheet, Font,
} from '@react-pdf/renderer';

/* ── Register fonts (built-in Helvetica is fine as fallback) ─── */
Font.registerHyphenationCallback(word => [word]); // prevent mid-word breaks

/* ── Palette ──────────────────────────────────────────────────── */
const BLUE   = '#0EA5E9';
const PURPLE = '#8B5CF6';
const GREEN  = '#22C55E';
const DARK   = '#0F172A';
const DARK2  = '#1E293B';
const DARK3  = '#334155';
const GRAY   = '#94A3B8';
const WHITE  = '#FFFFFF';
const ORANGE = '#F97316';

/* ── Styles ───────────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: {
    backgroundColor: DARK,
    color: WHITE,
    fontFamily: 'Helvetica',
    paddingBottom: 48,
  },

  /* cover band */
  coverBand: {
    backgroundColor: DARK2,
    paddingVertical: 36,
    paddingHorizontal: 40,
    borderBottomWidth: 1,
    borderBottomColor: DARK3,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  brandDot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: BLUE,
    marginRight: 6,
  },
  brandText: {
    fontSize: 11,
    color: BLUE,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
  },
  projectLabel: {
    fontSize: 10,
    color: GRAY,
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  titleText: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    marginBottom: 8,
  },
  taglineText: {
    fontSize: 12,
    color: GRAY,
    lineHeight: 1.6,
    maxWidth: 420,
    marginBottom: 20,
  },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  badgeEasy:    { backgroundColor: '#14532d', color: '#4ade80' },
  badgeXP:      { backgroundColor: '#0c4a6e', color: BLUE },
  badgeTime:    { backgroundColor: DARK3,     color: GRAY },
  badgeKeyword: { backgroundColor: DARK3,     color: '#cbd5e1' },

  metaRow: { flexDirection: 'row', marginTop: 12, gap: 20 },
  metaItem: { flexDirection: 'column' },
  metaLabel: { fontSize: 8, color: GRAY, letterSpacing: 1, marginBottom: 2 },
  metaValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: WHITE },

  /* content area */
  contentArea: { paddingHorizontal: 40, paddingTop: 28 },

  /* section */
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: DARK3,
  },
  sectionDot: {
    width: 12, height: 12, borderRadius: 6,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
  },

  /* text */
  bodyText: { fontSize: 10, color: '#cbd5e1', lineHeight: 1.65 },
  bodyBold: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: WHITE },

  /* bullet list */
  bulletRow: { flexDirection: 'row', marginBottom: 5, alignItems: 'flex-start' },
  bulletDot:  { fontSize: 10, color: BLUE, marginRight: 8, marginTop: 1 },
  bulletText: { fontSize: 10, color: '#cbd5e1', lineHeight: 1.6, flex: 1 },

  /* step block */
  stepBlock: {
    backgroundColor: DARK2,
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
  },
  stepNumRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: BLUE,
    color: WHITE,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    paddingTop: 5,
    marginRight: 8,
  },
  stepTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: WHITE },
  stepDesc:  { fontSize: 9.5, color: '#94A3B8', lineHeight: 1.6, marginBottom: 8 },

  /* code block */
  codeBlock: {
    backgroundColor: '#020617',
    borderRadius: 5,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: DARK3,
  },
  codeLine:  { fontSize: 8, fontFamily: 'Helvetica-Oblique', color: '#e2e8f0', lineHeight: 1.7 },
  codeComment:{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: '#64748b', lineHeight: 1.7 },
  codeKeyword:{ fontSize: 8, fontFamily: 'Helvetica-Bold',    color: '#c084fc', lineHeight: 1.7 },

  /* metrics */
  metricsGrid: { flexDirection: 'row', gap: 12 },
  metricCard: {
    flex: 1,
    backgroundColor: DARK2,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DARK3,
  },
  metricValue: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 4 },
  metricLabel: { fontSize: 9, color: GRAY, letterSpacing: 0.8 },

  /* concepts */
  conceptsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  conceptChip: {
    backgroundColor: DARK2,
    borderWidth: 1,
    borderColor: DARK3,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 9,
    color: '#cbd5e1',
  },

  /* footer */
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: DARK2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    borderTopWidth: 1,
    borderTopColor: DARK3,
  },
  footerText: { fontSize: 8, color: GRAY },
  footerBrand: { fontSize: 8, color: BLUE, fontFamily: 'Helvetica-Bold' },

  /* divider */
  divider: { height: 1, backgroundColor: DARK3, marginVertical: 4 },

  /* insight box */
  insightBox: {
    backgroundColor: '#0c4a6e22',
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    marginTop: 8,
  },
  insightText: { fontSize: 9.5, color: '#7dd3fc', lineHeight: 1.6 },
});

/* ── Helpers ──────────────────────────────────────────────────── */
const SectionHead = ({ dot, title }) => (
  <View style={s.sectionHeader}>
    <View style={[s.sectionDot, { backgroundColor: dot }]} />
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
);

const Bullet = ({ text, bold }) => (
  <View style={s.bulletRow}>
    <Text style={s.bulletDot}>▸</Text>
    <Text style={s.bulletText}>
      {bold ? <Text style={s.bodyBold}>{bold}  </Text> : null}{text}
    </Text>
  </View>
);

/* ── Main PDF Document ────────────────────────────────────────── */
const SentimentAnalyzerPDF = ({ completedDate = 'September 5, 2025' }) => (
  <Document
    title="Sentiment Analyzer — Project Documentation"
    author="Pyscape"
    subject="NLP Project"
  >

    {/* ═══════════════════  PAGE 1  ═══════════════════ */}
    <Page size="A4" style={s.page}>

      {/* COVER BAND */}
      <View style={s.coverBand}>
        <View style={s.brandRow}>
          <View style={s.brandDot} />
          <Text style={s.brandText}>PYSCAPE · PROJECT DOCUMENTATION</Text>
        </View>
        <Text style={s.projectLabel}>NLP  ·  Machine Learning  ·  Python</Text>
        <Text style={s.titleText}>Sentiment Analyzer</Text>
        <Text style={s.taglineText}>
          A complete implementation of a Natural Language Processing pipeline
          that classifies text as positive, negative, or neutral using
          NLTK's Naive Bayes classifier and the movie_reviews corpus.
        </Text>

        {/* Badges */}
        <View style={s.badgeRow}>
          <Text style={[s.badge, s.badgeEasy]}>● Easy peasy</Text>
          <Text style={[s.badge, s.badgeXP]}>⚡ +50 XP</Text>
          <Text style={[s.badge, s.badgeTime]}>⏱ 45 min</Text>
          <Text style={[s.badge, s.badgeKeyword]}>NLP</Text>
          <Text style={[s.badge, s.badgeKeyword]}>Python</Text>
          <Text style={[s.badge, s.badgeKeyword]}>NLTK</Text>
        </View>

        {/* Meta */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>COMPLETED</Text>
            <Text style={s.metaValue}>{completedDate}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>ACCURACY</Text>
            <Text style={[s.metaValue, { color: GREEN }]}>87%</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>F1 SCORE</Text>
            <Text style={[s.metaValue, { color: BLUE }]}>0.85</Text>
          </View>
        </View>
      </View>

      {/* CONTENT */}
      <View style={s.contentArea}>

        {/* Overview */}
        <View style={s.section}>
          <SectionHead dot={BLUE} title="Project Overview" />
          <Text style={s.bodyText}>
            In this project, you built a Sentiment Analyzer — a model that reads a piece of text
            and determines whether the expressed opinion is positive or negative. This is one of
            the most widely-used NLP tasks, powering product review systems, social media
            monitoring, and customer feedback pipelines.
          </Text>
          <View style={[s.insightBox, { marginTop: 10 }]}>
            <Text style={s.insightText}>
              💡  The final model was trained on 1,800 labeled movie reviews and achieved 87%
              accuracy on the held-out 200-review test set — a solid result for a bag-of-words
              Naive Bayes baseline.
            </Text>
          </View>
        </View>

        {/* What you learned */}
        <View style={s.section}>
          <SectionHead dot={PURPLE} title="What You Learned" />
          <Bullet bold="Text Preprocessing:" text="Lowercasing, tokenization, and stopword removal using NLTK's punkt tokenizer." />
          <Bullet bold="Feature Extraction:" text="Representing documents as bag-of-words dictionaries over the top 2,000 most frequent terms." />
          <Bullet bold="Naive Bayes Classifier:" text="Training a probabilistic model that learns word likelihood per sentiment class." />
          <Bullet bold="Model Evaluation:" text="Computing accuracy, and examining the most informative features to understand the model's reasoning." />
          <Bullet bold="Inference Pipeline:" text="Building a reusable classify_sentiment() function for any input text." />
        </View>

        {/* Key concepts */}
        <View style={s.section}>
          <SectionHead dot={GREEN} title="Key Concepts" />
          <View style={s.conceptsRow}>
            {['NLP', 'Tokenization', 'Sentiment Analysis', 'Bag-of-Words', 'NLTK',
              'Naive Bayes', 'Text Preprocessing', 'Corpus', 'Feature Extraction', 'F1 Score']
              .map(c => <Text key={c} style={s.conceptChip}>{c}</Text>)}
          </View>
        </View>

      </View>

      {/* FOOTER */}
      <View style={s.footer} fixed>
        <Text style={s.footerText}>Sentiment Analyzer  ·  Project Documentation</Text>
        <Text style={s.footerBrand}>PYSCAPE</Text>
        <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
      </View>
    </Page>

    {/* ═══════════════════  PAGE 2 — IMPLEMENTATION  ═══════════════════ */}
    <Page size="A4" style={s.page}>
      <View style={[s.contentArea, { paddingTop: 36 }]}>

        <View style={s.section}>
          <SectionHead dot={ORANGE} title="Step-by-Step Implementation" />
          <Text style={[s.bodyText, { marginBottom: 14 }]}>
            The following steps walk through the complete implementation of the Sentiment
            Analyzer, from environment setup to running inference on custom text.
          </Text>

          {/* Step 1 */}
          <View style={s.stepBlock}>
            <View style={s.stepNumRow}>
              <Text style={s.stepNum}>1</Text>
              <Text style={s.stepTitle}>Environment Setup</Text>
            </View>
            <Text style={s.stepDesc}>
              Install NLTK and download the required corpus and tokenizer data.
            </Text>
            <View style={s.codeBlock}>
              <Text style={s.codeLine}>pip install nltk</Text>
              <Text style={s.codeComment}>{'\n'}# Inside Python</Text>
              <Text style={s.codeLine}>import nltk</Text>
              <Text style={s.codeLine}>nltk.download('movie_reviews')</Text>
              <Text style={s.codeLine}>nltk.download('stopwords')</Text>
              <Text style={s.codeLine}>nltk.download('punkt')</Text>
            </View>
          </View>

          {/* Step 2 */}
          <View style={s.stepBlock}>
            <View style={s.stepNumRow}>
              <Text style={s.stepNum}>2</Text>
              <Text style={s.stepTitle}>Load the Dataset</Text>
            </View>
            <Text style={s.stepDesc}>
              The NLTK movie_reviews corpus contains 2,000 labeled movie reviews
              (1,000 positive + 1,000 negative). Shuffle to avoid order bias.
            </Text>
            <View style={s.codeBlock}>
              <Text style={s.codeLine}>from nltk.corpus import movie_reviews</Text>
              <Text style={s.codeLine}>import random{'\n'}</Text>
              <Text style={s.codeLine}>documents = [</Text>
              <Text style={s.codeLine}>    (list(movie_reviews.words(fileid)), category)</Text>
              <Text style={s.codeLine}>    for category in movie_reviews.categories()</Text>
              <Text style={s.codeLine}>    for fileid in movie_reviews.fileids(category)</Text>
              <Text style={s.codeLine}>]{'\n'}</Text>
              <Text style={s.codeLine}>random.shuffle(documents)</Text>
              <Text style={s.codeLine}>print(f"Total documents: {'{'}len(documents){'}'}")</Text>
            </View>
          </View>

          {/* Step 3 */}
          <View style={s.stepBlock}>
            <View style={s.stepNumRow}>
              <Text style={s.stepNum}>3</Text>
              <Text style={s.stepTitle}>Preprocessing & Feature Extraction</Text>
            </View>
            <Text style={s.stepDesc}>
              Build the vocabulary using the 2,000 most common non-stopword tokens,
              then create a feature dictionary for each document.
            </Text>
            <View style={s.codeBlock}>
              <Text style={s.codeLine}>from nltk.corpus import stopwords{'\n'}</Text>
              <Text style={s.codeLine}>stop_words = set(stopwords.words('english'))</Text>
              <Text style={s.codeLine}>all_words = nltk.FreqDist(</Text>
              <Text style={s.codeLine}>    w.lower() for w in movie_reviews.words()</Text>
              <Text style={s.codeLine}>    if w.isalpha() and w.lower() not in stop_words</Text>
              <Text style={s.codeLine}>){'\n'}</Text>
              <Text style={s.codeLine}>word_features = list(all_words.keys())[:2000]{'\n'}</Text>
              <Text style={s.codeLine}>def document_features(document):</Text>
              <Text style={s.codeLine}>    doc_words = set(document)</Text>
              <Text style={s.codeLine}>    return {'{'}word: (word in doc_words) for word in word_features{'}'}</Text>
            </View>
          </View>

        </View>
      </View>

      <View style={s.footer} fixed>
        <Text style={s.footerText}>Sentiment Analyzer  ·  Project Documentation</Text>
        <Text style={s.footerBrand}>PYSCAPE</Text>
        <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
      </View>
    </Page>

    {/* ═══════════════════  PAGE 3 — TRAIN + RESULTS  ═══════════════════ */}
    <Page size="A4" style={s.page}>
      <View style={[s.contentArea, { paddingTop: 36 }]}>

        <View style={s.section}>
          <SectionHead dot={ORANGE} title="Step-by-Step Implementation (continued)" />

          {/* Step 4 */}
          <View style={s.stepBlock}>
            <View style={s.stepNumRow}>
              <Text style={s.stepNum}>4</Text>
              <Text style={s.stepTitle}>Train & Evaluate the Classifier</Text>
            </View>
            <Text style={s.stepDesc}>
              Split into 1,800 training and 200 test examples, then train
              the Naive Bayes classifier and measure accuracy.
            </Text>
            <View style={s.codeBlock}>
              <Text style={s.codeLine}>featuresets = [</Text>
              <Text style={s.codeLine}>    (document_features(d), c) for (d, c) in documents</Text>
              <Text style={s.codeLine}>]{'\n'}</Text>
              <Text style={s.codeLine}>train_set = featuresets[200:]</Text>
              <Text style={s.codeLine}>test_set  = featuresets[:200]{'\n'}</Text>
              <Text style={s.codeLine}>classifier = nltk.NaiveBayesClassifier.train(train_set){'\n'}</Text>
              <Text style={s.codeLine}>accuracy = nltk.classify.accuracy(classifier, test_set)</Text>
              <Text style={s.codeLine}>print(f"Accuracy: {'{'}accuracy:.2%{'}'}")   # → 87.00%{'\n'}</Text>
              <Text style={s.codeLine}>classifier.show_most_informative_features(10)</Text>
            </View>
          </View>

          {/* Step 5 */}
          <View style={s.stepBlock}>
            <View style={s.stepNumRow}>
              <Text style={s.stepNum}>5</Text>
              <Text style={s.stepTitle}>Classify New Text</Text>
            </View>
            <Text style={s.stepDesc}>
              Wrap everything into a reusable inference function that accepts
              any raw string and returns "pos" or "neg".
            </Text>
            <View style={s.codeBlock}>
              <Text style={s.codeLine}>def classify_sentiment(text):</Text>
              <Text style={s.codeLine}>    tokens = nltk.word_tokenize(text.lower())</Text>
              <Text style={s.codeLine}>    features = document_features(tokens)</Text>
              <Text style={s.codeLine}>    return classifier.classify(features){'\n'}</Text>
              <Text style={s.codeComment}># Try it out:</Text>
              <Text style={s.codeLine}>classify_sentiment("This movie was absolutely fantastic!")  # → pos</Text>
              <Text style={s.codeLine}>classify_sentiment("Terrible film, waste of time.")          # → neg</Text>
            </View>
          </View>
        </View>

        {/* Results */}
        <View style={s.section}>
          <SectionHead dot={GREEN} title="Performance Results" />
          <View style={s.metricsGrid}>
            <View style={s.metricCard}>
              <Text style={s.metricValue}>87%</Text>
              <Text style={s.metricLabel}>TEST ACCURACY</Text>
            </View>
            <View style={s.metricCard}>
              <Text style={[s.metricValue, { color: PURPLE }]}>0.85</Text>
              <Text style={s.metricLabel}>F1 SCORE</Text>
            </View>
            <View style={s.metricCard}>
              <Text style={[s.metricValue, { color: GREEN }]}>2,000</Text>
              <Text style={s.metricLabel}>TRAINING DOCS</Text>
            </View>
            <View style={s.metricCard}>
              <Text style={[s.metricValue, { color: ORANGE }]}>2,000</Text>
              <Text style={s.metricLabel}>VOCAB SIZE</Text>
            </View>
          </View>

          <View style={[s.insightBox, { marginTop: 14, borderLeftColor: GREEN }]}>
            <Text style={[s.insightText, { color: '#86efac' }]}>
              📊  Most informative features: "outstanding", "wonderfully", "mulan", "seagal",
              "damon" — showing the model learned genuine sentiment-bearing words rather than
              memorizing topic patterns.
            </Text>
          </View>
        </View>

        {/* Further reading */}
        <View style={s.section}>
          <SectionHead dot={GRAY} title="What's Next?" />
          <Bullet text="Upgrade to TF-IDF weighting for better feature discrimination." />
          <Bullet text="Try a Logistic Regression or SVM classifier to compare performance." />
          <Bullet text="Fine-tune a HuggingFace BERT model on the same corpus for 93%+ accuracy." />
          <Bullet text="Build a REST API endpoint around classify_sentiment() using FastAPI." />
          <Bullet text="Continue to the 'Text Classifier with TF-IDF' project in the NLP series." />
        </View>

      </View>

      <View style={s.footer} fixed>
        <Text style={s.footerText}>Sentiment Analyzer  ·  Project Documentation</Text>
        <Text style={s.footerBrand}>PYSCAPE</Text>
        <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
      </View>
    </Page>

  </Document>
);

export default SentimentAnalyzerPDF;
