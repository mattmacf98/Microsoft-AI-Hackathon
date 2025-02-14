import { Quaternion } from '@babylonjs/core/Maths/math.vector';

export interface IEasingParameters<T> {
    easingType: number;
    initialValue: T;
    targetValue: T;
    cp1?: T;
    cp2?: T;
}

/**
 * Eases a floating-point value from its initial value to its target value over time.
 *
 * @param t - The current progress (between 0 and 1) of the easing animation.
 * @param easingParameters -  parameters used to determine easing function
 * @returns The eased floating-point value at the current progress.
 */


export const easeFloat = (t: number, easingParameters: IEasingParameters<number>): number => {
    if (easingParameters.easingType === 0) {
        // cubic
        return cubicBezierFloat(
            t,
            easingParameters.initialValue,
            easingParameters.targetValue,
            easingParameters.cp1!,
            easingParameters.cp2!,
        );
    } else if (easingParameters.easingType == 2) {
        //linear
        return linearFloat(t, easingParameters.initialValue, easingParameters.targetValue);
    } else {
        return easingParameters.targetValue;
    }
};

/**
 * Eases an array of three floating-point values from their initial values to their target values over time.
 *
 * @param t - The current progress (between 0 and 1) of the easing animation.
 * @param easingParameters -  parameters used to determine easing function
 * @returns An array of eased floating-point values at the current progress.
 */
export const easeFloat3 = (t: number, easingParameters: IEasingParameters<number[]>): number[] => {
    if (easingParameters.easingType === 0) {
        //cubic
        return [
            cubicBezierFloat(
                t,
                easingParameters.initialValue[0],
                easingParameters.targetValue[0],
                easingParameters.cp1![0],
                easingParameters.cp2![0],
            ),
            cubicBezierFloat(
                t,
                easingParameters.initialValue[1],
                easingParameters.targetValue[1],
                easingParameters.cp1![1],
                easingParameters.cp2![1],
            ),
            cubicBezierFloat(
                t,
                easingParameters.initialValue[2],
                easingParameters.targetValue[2],
                easingParameters.cp1![2],
                easingParameters.cp2![2],
            ),
        ];
    } else if (easingParameters.easingType == 2) {
        //linear
        return [
            linearFloat(t, easingParameters.initialValue[0], easingParameters.targetValue[0]),
            linearFloat(t, easingParameters.initialValue[1], easingParameters.targetValue[1]),
            linearFloat(t, easingParameters.initialValue[2], easingParameters.targetValue[2]),
        ];
    } else {
        return [easingParameters.targetValue[0], easingParameters.targetValue[1], easingParameters.targetValue[2]];
    }
};

/**
 * Eases an array of four floating-point values from their initial values to their target values over time.
 *
 * @param t - The current progress (between 0 and 1) of the easing animation.
 * @param easingParameters -  parameters used to determine easing function
 * @returns An array of eased floating-point values at the current progress.
 */
export const easeFloat4 = (t: number, easingParameters: IEasingParameters<number[]>): number[] => {
    if (easingParameters.easingType === 1) {
        //slerp
        return slerpFloat4(t, easingParameters.initialValue, easingParameters.targetValue);
    } else {
        return [
            easingParameters.targetValue[0],
            easingParameters.targetValue[1],
            easingParameters.targetValue[2],
            easingParameters.targetValue[3],
        ];
    }
};

const slerpFloat4 = (t: number, initialVal: number[], targetVal: number[]): number[] => {
    const q1 = new Quaternion(initialVal[1], initialVal[2], initialVal[3], initialVal[0]);
    const q2 = new Quaternion(targetVal[1], targetVal[2], targetVal[3], targetVal[0]);

    const outQuat = Quaternion.Zero();
    Quaternion.SmoothToRef(q1, q2, t, 1, outQuat);
    return [outQuat.w, outQuat.x, outQuat.y, outQuat.z];
};

const cubicBezierFloat = (t: number, initialVal: number, targetVal: number, cp1: number, cp2: number): number => {
    return (
        Math.pow(1 - t, 3) * initialVal +
        3 * Math.pow(1 - t, 2) * t * cp1 +
        3 * (1 - t) * Math.pow(t, 2) * cp2 +
        Math.pow(t, 3) * targetVal
    );
};

const linearFloat = (t: number, initialVal: number, targetVal: number): number => {
    return initialVal + (targetVal - initialVal) * t;
};
