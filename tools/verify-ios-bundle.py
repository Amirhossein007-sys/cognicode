"""Validate launch metadata and bundled web resources before packaging an IPA."""
import plistlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def verify_identifiers(app_id, widget_id):
    assert app_id and widget_id, "Missing app or widget bundle identifier"
    assert widget_id.startswith(app_id + "."), (
        f"Widget identifier {widget_id!r} must start with {app_id + '.'!r}"
    )


def verify_build_settings(path):
    with Path(path).open(encoding="utf-8-sig") as stream:
        targets = {item["target"]: item["buildSettings"] for item in json.load(stream)}
    verify_identifiers(
        targets["CogniCode"]["PRODUCT_BUNDLE_IDENTIFIER"],
        targets["CogniCodeWidgets"]["PRODUCT_BUNDLE_IDENTIFIER"],
    )
    print("Generated app/widget bundle identifiers verified")


def verify(bundle=None):
    source = ROOT / "native/CogniCode/Info.plist"
    with source.open("rb") as stream:
        expected = plistlib.load(stream)
    assert expected.get("UILaunchStoryboardName") == "LaunchScreen"
    assert expected.get("UILaunchScreen", {}).get("UIColorName") == "LaunchBG"
    assert (ROOT / "native/CogniCode/LaunchScreen.storyboard").is_file()
    assert expected.get("NSSupportsLiveActivities") is True
    assert expected.get("CADisableMinimumFrameDurationOnPhone") is True
    assert expected.get("CFBundleIdentifier") == "$(PRODUCT_BUNDLE_IDENTIFIER)"
    with (ROOT / "native/CogniCodeWidgets/Info.plist").open("rb") as stream:
        widget_source = plistlib.load(stream)
    assert widget_source.get("CFBundleIdentifier") == "$(PRODUCT_BUNDLE_IDENTIFIER)"
    assert widget_source.get("CFBundleVersion") == expected.get("CFBundleVersion"), "App/extension build versions must match"
    if bundle is None:
        print("Source launch configuration verified")
        return
    bundle = Path(bundle)
    with (bundle / "Info.plist").open("rb") as stream:
        actual = plistlib.load(stream)
    for key in ("UILaunchStoryboardName", "UILaunchScreen", "UIRequiresFullScreen",
                "UISupportedInterfaceOrientations", "NSCameraUsageDescription",
                "NSPhotoLibraryUsageDescription"):
        assert actual.get(key) == expected[key], f"Compiled plist lost or changed {key}"
    assert actual.get("UIDeviceFamily") == [1], "Expected an iPhone application"
    assert (bundle / "LaunchScreen.storyboardc").is_dir(), "Missing compiled launch storyboard"
    assert (bundle / "Assets.car").is_file(), "Missing compiled assets"
    widget = bundle / "PlugIns/CogniCodeWidgets.appex"
    assert widget.is_dir(), "Missing embedded Live Activity extension"
    with (widget / "Info.plist").open("rb") as stream:
        widget_info = plistlib.load(stream)
    verify_identifiers(actual.get("CFBundleIdentifier"), widget_info.get("CFBundleIdentifier"))
    assert actual.get("NSSupportsLiveActivities") is True, "Compiled app lost Live Activities support"
    assert widget_info.get("CFBundleVersion") == actual.get("CFBundleVersion"), "Compiled app/extension build versions differ"
    assert (widget / widget_info["CFBundleExecutable"]).is_file(), "Missing widget executable"
    assert widget_info["NSExtension"]["NSExtensionPointIdentifier"] == "com.apple.widgetkit-extension"
    assert (widget / "Assets.car").is_file(), "Missing Live Activity logo assets"
    for source_file in (ROOT / "native/Web").rglob("*"):
        if source_file.is_file():
            relative = source_file.relative_to(ROOT / "native")
            target = bundle / relative
            assert target.is_file(), f"Missing {relative}"
            assert target.read_bytes() == source_file.read_bytes(), f"Stale {relative}"
    print("Compiled launch configuration and all web resources verified")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--build-settings":
        verify_build_settings(sys.argv[2])
    else:
        verify(sys.argv[1] if len(sys.argv) > 1 else None)
