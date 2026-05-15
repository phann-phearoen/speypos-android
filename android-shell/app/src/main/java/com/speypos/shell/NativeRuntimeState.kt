package com.speypos.shell

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow

enum class ShellAction {
    RELOAD_FRONTEND,
    RECREATE_ACTIVITY
}

class NativeRuntimeState {
    var startupPhase: String = "booting"

    private val _actions = MutableSharedFlow<ShellAction>(extraBufferCapacity = 1)
    val actions = _actions.asSharedFlow()

    fun emitAction(action: ShellAction) {
        _actions.tryEmit(action)
    }
}
