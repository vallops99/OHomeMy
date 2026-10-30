"""Tests for fake-house/scripts/generate.py: manifest entries in, packages out."""

import datetime
import importlib.util
import json
import pathlib

import pytest
import yaml

FAKE_HOUSE = pathlib.Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("generate", FAKE_HOUSE / "scripts" / "generate.py")
generate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(generate)


def build(*entities: dict) -> "generate.Builder":
    b = generate.Builder({"entities": list(entities)})
    for e in entities:
        b.build(e)
    return b


def only(template: list, platform: str) -> dict:
    [cfg] = [c for block in template for c in block.get(platform, [])]
    return cfg


ENUM = {"id": "sensor.dw_door", "name": "Porta", "kind": "sensor",
        "options": ["closed", "locked", "open"], "initial": "closed"}


def test_an_enum_sensor_reads_a_settable_select():
    b = build(ENUM)
    select = b.input_select["fake_mode_sensor_dw_door"]
    assert select["options"] == ["closed", "locked", "open"]
    assert select["initial"] == "closed"
    sensor = only(b.template, "sensor")
    assert sensor["device_class"] == "enum"
    assert "input_select.fake_mode_sensor_dw_door" in sensor["state"]


def test_an_unquoted_off_in_the_options_stops_the_generator():
    # YAML reads a bare `off` as False, which Home Assistant's input_select rejects.
    with pytest.raises(SystemExit):
        build({**ENUM, "options": [False, "present", "confirmed"], "initial": "off"})


def test_every_manifest_option_is_a_string():
    manifest = yaml.safe_load((FAKE_HOUSE / "manifest.yaml").read_text())
    for e in manifest["entities"]:
        for o in e.get("options", []):
            assert isinstance(o, str), f"{e['id']}: option {o!r} needs quotes"


def test_a_timestamp_sensor_starts_ahead_by_its_minutes():
    b = build({"id": "sensor.dw_end", "name": "Fine", "kind": "sensor",
               "device_class": "timestamp", "initial_in_minutes": 95})
    helper = b.input_datetime["fake_time_sensor_dw_end"]
    assert helper["has_date"] and helper["has_time"]
    start = datetime.datetime.strptime(helper["initial"], "%Y-%m-%d %H:%M:%S")
    ahead = start - datetime.datetime.now()
    assert datetime.timedelta(minutes=93) < ahead <= datetime.timedelta(minutes=95)
    assert only(b.template, "sensor")["device_class"] == "timestamp"


def test_a_script_moves_its_enum_to_the_option():
    b = build(ENUM, {"id": "script.dw_start", "name": "Avvia", "kind": "script",
                     "sets": {"entity": "sensor.dw_door", "option": "open"}})
    [step] = b.script["dw_start"]["sequence"]
    assert step["action"] == "input_select.select_option"
    assert step["target"]["entity_id"] == "input_select.fake_mode_sensor_dw_door"
    assert step["data"]["option"] == "open"


def test_a_button_can_go_unavailable():
    b = build({"id": "button.dw_stop", "name": "Ferma", "kind": "button"})
    assert "input_boolean.fake_online_button_dw_stop" in only(b.template, "button")["availability"]


def test_a_binary_sensor_keeps_its_device_class():
    b = build({"id": "binary_sensor.dw_remote", "name": "Remoto", "kind": "binary_sensor",
               "device_class": "running", "initial": "on"})
    assert b.input_boolean["fake_state_binary_sensor_dw_remote"]["initial"] is True
    assert only(b.template, "binary_sensor")["device_class"] == "running"


def test_the_helpers_map_names_each_entitys_helpers_by_role():
    b = build(ENUM, {"id": "sensor.dw_end", "name": "Fine", "kind": "sensor",
                     "device_class": "timestamp"})
    assert b.helpers["sensor.dw_door"] == {
        "online": "input_boolean.fake_online_sensor_dw_door",
        "mode": "input_select.fake_mode_sensor_dw_door",
    }
    assert b.helpers["sensor.dw_end"]["time"] == "input_datetime.fake_time_sensor_dw_end"


def test_the_committed_helpers_map_matches_the_manifest():
    # `ha-dashboard/scripts/fit-house.ts` drives the house through this file.
    manifest = yaml.safe_load((FAKE_HOUSE / "manifest.yaml").read_text())
    committed = json.loads((FAKE_HOUSE / "helpers.json").read_text())
    assert committed == generate.helpers_map(manifest), "re-run generate.py"


STATE = {"id": "sensor.dw_state", "name": "Stato", "kind": "sensor",
         "options": ["ready", "run", "finished"], "initial": "run"}
END = {"id": "sensor.dw_end", "name": "Fine", "kind": "sensor", "device_class": "timestamp"}
PROGRESS = {"id": "sensor.dw_progress", "name": "Avanzamento", "kind": "sensor", "unit": "%",
            "initial": 40, "runs": {"state": "sensor.dw_state", "ends_at": "sensor.dw_end",
                                    "program_minutes": 95}}


def test_a_progress_that_runs_ticks_each_minute_while_its_state_is_run():
    b = build(STATE, END, PROGRESS)
    [wash] = b.automation
    assert {"trigger": "time_pattern", "minutes": "/1"} in wash["triggers"]
    [running] = wash["conditions"]
    assert running == {"condition": "state", "entity_id": "input_select.fake_mode_sensor_dw_state",
                       "state": "run"}


def test_a_wash_reads_and_moves_the_helpers_of_its_state_end_and_progress():
    text = yaml.safe_dump(build(STATE, END, PROGRESS).automation)
    for helper in ("input_select.fake_mode_sensor_dw_state", "input_datetime.fake_time_sensor_dw_end",
                   "input_number.fake_value_sensor_dw_progress"):
        assert helper in text
    assert "finished" in text
    assert "5700" in text  # a fresh program: 95 minutes, in seconds
    assert "&id" not in text


def test_a_progress_with_no_runs_does_not_tick():
    b = build({k: v for k, v in PROGRESS.items() if k != "runs"})
    assert b.automation == []
