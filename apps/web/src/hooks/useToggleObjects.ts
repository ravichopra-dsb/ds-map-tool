import { useSyncExternalStore } from "react";

export type HiddenFeatureKey = string;

type HiddenFeatureTypes = Record<HiddenFeatureKey, boolean>;

let state: HiddenFeatureTypes = {
    arrow: false,
    dimension: false,
    freehand: false,
    polyline: false,
    point: false,
    measure: false,
    text: false,
    legends: false,
    revcloud: false,
};

const listeners = new Set<() => void>();

const emitChange = () => {
    listeners.forEach((l) => l());
};

export const useHiddenFeatures = () => {
    const hiddenTypes = useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => state
    );

    const toggleFeature = (key: HiddenFeatureKey) => {
        state = { ...state, [key]: !state[key] };
        emitChange();
    };

    const setFeature = (key: HiddenFeatureKey, value: boolean) => {
        state = { ...state, [key]: value };
        emitChange();
    };

    return { hiddenTypes, toggleFeature, setFeature };
};
