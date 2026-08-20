//
//  WatchContentView.swift
//  Rep Gym Companion - watchOS SwiftUI View
//

import SwiftUI
import WatchKit

struct WatchContentView: View {
    @StateObject private var workoutManager = WatchWorkoutSessionManager()

    var body: some View {
        NavigationStack {
            if !workoutManager.isRunning {
                VStack(spacing: 12) {
                    Image(systemName: "figure.strengthtraining.traditional")
                        .font(.system(size: 38))
                        .foregroundColor(Color(red: 201/255, green: 255/255, blue: 61/255))
                    
                    Text("Rep Companion")
                        .font(.headline)
                        .fontWeight(.bold)

                    Button(action: {
                        workoutManager.startWorkout()
                    }) {
                        Text("Start Workout")
                            .fontWeight(.bold)
                            .foregroundColor(.black)
                    }
                    .background(Color(red: 201/255, green: 255/255, blue: 61/255))
                    .cornerRadius(12)
                }
                .padding()
            } else {
                TabView {
                    // Page 1: Active Exercise & Rest Countdown
                    VStack(spacing: 6) {
                        Text(workoutManager.currentExerciseName)
                            .font(.system(size: 15, weight: .bold))
                            .lineLimit(1)
                            .foregroundColor(Color(red: 201/255, green: 255/255, blue: 61/255))

                        Text("Set \(workoutManager.currentSet) of \(workoutManager.totalSets)")
                            .font(.caption2)
                            .foregroundColor(.gray)

                        if workoutManager.isResting {
                            VStack(spacing: 2) {
                                Text("\(workoutManager.restTimerRemaining)s")
                                    .font(.system(size: 32, weight: .black, design: .rounded))
                                    .foregroundColor(.cyan)

                                HStack(spacing: 8) {
                                    Button("+15") {
                                        workoutManager.addRestTime(15)
                                    }
                                    .buttonStyle(.bordered)
                                    .font(.system(size: 11))

                                    Button("Skip") {
                                        workoutManager.skipRestTimer()
                                    }
                                    .buttonStyle(.bordered)
                                    .font(.system(size: 11))
                                }
                            }
                        } else {
                            Button(action: {
                                workoutManager.completeSet(restSeconds: 90)
                            }) {
                                Text("Complete Set")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.black)
                            }
                            .background(Color(red: 201/255, green: 255/255, blue: 61/255))
                            .cornerRadius(10)
                            .padding(.top, 4)
                        }
                    }
                    .padding(.horizontal, 4)

                    // Page 2: Live Biometrics & Vitals
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "heart.fill")
                                .foregroundColor(.red)
                            Text("\(Int(workoutManager.heartRate)) BPM")
                                .font(.system(size: 16, weight: .heavy, design: .rounded))
                        }

                        HStack {
                            Image(systemName: "flame.fill")
                                .foregroundColor(.orange)
                            Text("\(Int(workoutManager.activeCalories)) kcal")
                                .font(.system(size: 16, weight: .heavy, design: .rounded))
                        }

                        HStack {
                            Image(systemName: "clock.fill")
                                .foregroundColor(.green)
                            Text(formatTime(workoutManager.elapsedTime))
                                .font(.system(size: 16, weight: .heavy, design: .rounded))
                        }

                        Button("End Session") {
                            workoutManager.endWorkout()
                        }
                        .tint(.red)
                        .font(.caption2)
                    }
                    .padding()
                }
                .tabViewStyle(.page)
            }
        }
    }

    private func formatTime(_ interval: TimeInterval) -> String {
        let minutes = Int(interval) / 60
        let seconds = Int(interval) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}
