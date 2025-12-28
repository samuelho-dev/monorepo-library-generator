/**
 * User Events Index
 *
 * @module @samuelho-dev/feature-user/server/events
 */

export type { UserEventPublisherInterface } from './publisher'
export {
  createUserEventSubscription,
  UserEventPublisher,
  UserEventTopics
} from './publisher'
