// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RepHealthCompanion",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "RepHealthCompanion",
            targets: ["RepHealthCompanion"]
        )
    ],
    targets: [
        .target(
            name: "RepHealthCompanion",
            path: ".",
            exclude: ["RepWorkoutLiveActivityWidget.swift"]
        )
    ]
)
