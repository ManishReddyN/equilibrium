/**
 * Standalone ref so code outside the component tree (notification-tap
 * handling, plan section 5.1) can navigate imperatively without importing
 * `RootNavigator.tsx` itself and risking a cycle.
 */
import {createNavigationContainerRef} from '@react-navigation/native';

import type {RootStackParamList} from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
