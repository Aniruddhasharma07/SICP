import {
  LocationQuality,
  ContextAwareDuplicateCheckResultDto,
  ContextAwareCandidateDto,
  TopicInsightItemDto,
} from './domain.types';

export {
  LocationQuality,
  ContextAwareDuplicateCheckResultDto,
  ContextAwareCandidateDto,
  TopicInsightItemDto,
};

export interface TopicInsightsDto {
  notice: string;
  relatedTopicChallenges: TopicInsightItemDto[];
}

export interface LocalIntelligenceDto {
  duplicates: ContextAwareCandidateDto[];
  related: ContextAwareCandidateDto[];
  systemicCandidates: ContextAwareCandidateDto[];
  unrelatedCount: number;
}
