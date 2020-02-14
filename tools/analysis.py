import sqlite3
import functools
import operator
import collections

import argparse
import matplotlib.pyplot as plt
import numpy as np

ALLOWED_ACTIONS = [
	#"MAIN_SET_TILE_RENDER_SIZE",
	"MAIN_REQUEST_QUERY_RESPONSE",
	#"MAIN_TILE_DATA_LOADED",
	#"MAIN_SUBQ_ITEM_HIGHLIGHTED",
	#"MAIN_SUBQ_ITEM_DEHIGHLIGHTED",
	"MAIN_SET_SCREEN_MODE",
	"MAIN_CHANGE_QUERY_INPUT",
	"MAIN_TILE_AREA_CLICKED",
	"TT_DISTRIB_SET_ACTIVE_BLOCK",
	"CONC_FILTER_SHOW_LINE_METADATA",
	"GEO_AREAS_SHOW_AREA_TOOLTIP",
	"GEO_AREAS_HIDE_AREA_TOOLTIP",
	"CONC_FILTER_HIDE_LINE_METADATA",
	"MAIN_GET_SOURCE_INFO",
	"MAIN_GET_SOURCE_INFO_DONE",
	"MAIN_SUBMIT_QUERY",
	"MAIN_ADD_SYSTEM_MESSAGE",
	"MAIN_ENABLE_ALT_VIEW_MODE",
	"MAIN_DISABLE_ALT_VIEW_MODE",
	"MAIN_ENABLE_TILE_TWEAK_MODE",
	"MAIN_SUBQ_CHANGED",
	"COLLOCATIONS_SET_SRCH_CONTEXT_TYPE",
	"MAIN_TOGGLE_GROUP_VISIBILITY",
	"SPEECH_CLICK_AUDIO_PLAYER",
	"SPEECH_AUDIO_PLAYER_STARTED",
	"SPEECH_PLAYED_LINE_CHANGED",
	"SPEECH_AUDIO_PLAYER_STOPPED",
	"MAIN_SET_EMPTY_RESULT",
	"MAIN_CLOSE_SOURCE_INFO",
	"MAIN_SHOW_GROUP_HELP",
	"MAIN_SHOW_GROUP_HELP_DONE",
	"MAIN_HIDE_GROUP_HELP",
	"MAIN_SHOW_TILE_HELP",
	"MAIN_LOAD_TILE_HELP_DONE",
	"MAIN_HIDE_TILE_HELP",
	"MAIN_REMOVE_SYSTEM_MESSAGE",
	"MAIN_WAKE_SUSPENDED_TILES",
	"MAIN_RETRY_TILE_LOAD",
	"SPEECH_CLICK_AUDIO_PLAY_ALL",
	"MAIN_DISABLE_TILE_TWEAK_MODE",
	"TIME_DISTRIB_CHANGE_CMP_WORD",
	"TIME_DISTRIB_SUBMIT_CMP_WORD",
	"MAIN_CHANGE_QUERY_TYPE"
]

def make_analysis(path):
    conn = sqlite3.connect(path)
    raw_chains = functools.reduce(operator.concat, conn.cursor().execute('''
        select group_concat(action, ";")
        from ( select * from telemetry order by timestamp asc ) as sub
        group by session
    ''').fetchall())
    conn.close()

    chains = collections.defaultdict(lambda: collections.defaultdict(int))
    for group in raw_chains:
        last_action = None
        for action in group.split(';'):
            if action not in ALLOWED_ACTIONS:
                continue
            if last_action is not None:
                chains[last_action][action] += 1
            last_action = action

    heatmap = np.zeros((len(ALLOWED_ACTIONS), len(ALLOWED_ACTIONS)), dtype=int)
    for action1, next_actions in chains.items():
        for action2, count in next_actions.items():
            heatmap[ALLOWED_ACTIONS.index(action1)][ALLOWED_ACTIONS.index(action2)] = count

    plt.figure(figsize=(10, 10))
    fig = plt.imshow(heatmap, cmap='viridis')
    plt.colorbar()

    start, end = fig.axes.get_xlim()
    fig.axes.xaxis.set_ticks(np.arange(start, end, 1))
    fig.axes.yaxis.set_ticks(np.arange(start, end, 1))

    fig.axes.set_xticklabels(ALLOWED_ACTIONS)
    fig.axes.set_yticklabels(ALLOWED_ACTIONS)
    fig.axes.tick_params(axis='both', which='major', labelsize=8)
    for tick in fig.axes.xaxis.get_major_ticks():
        tick.label.set_rotation('vertical')

    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    argparser = argparse.ArgumentParser('Kontext instalation script')
    argparser.add_argument('path', help='Path to telemetry database')
    args = argparser.parse_args()
    make_analysis(args.path)
