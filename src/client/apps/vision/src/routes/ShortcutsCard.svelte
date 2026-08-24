<script lang="ts">
const shortcuts = [
	["alt+1…alt+4", "toggle strip / nav / detail / statusbar"],
	["ctrl+space", "command palette (app shortcut)"],
	["ctrl+shift+k", "command palette (plugin default)"],
	["ctrl+/", "shortcut palette (plugin default)"],
	["ctrl+,", "settings modal (plugin default)"],
];
</script>

<div class="card bg-base-200 card-sm">
  <div class="card-body">
    <h2 class="card-title text-sm">Shortcuts</h2>
    <table class="table table-xs font-mono">
      <tbody>
        {#each shortcuts as [keys, what]}
          <tr>
            <td class="w-40"><kbd class="kbd kbd-sm">{keys}</kbd></td>
            <td>{what}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
