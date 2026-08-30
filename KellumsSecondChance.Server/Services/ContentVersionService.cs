namespace KellumsSecondChance.Server.Services;

/// <summary>
/// Tracks when published content last changed, so a browser or CDN cannot serve
/// an admin edit's stale predecessor for long.
///
/// There is no server-side content cache in this application — the only caching
/// is the `Cache-Control: max-age` the public content endpoints emit. Before this
/// existed, an administrator could publish a project and still see the old list
/// for the full cache window with no way to force a refresh.
///
/// The version is bumped by every admin content mutation and surfaced as an
/// ETag. Combined with a short max-age plus `must-revalidate`, a client's
/// conditional request gets a cheap 304 while nothing has changed, and the new
/// payload the instant something has.
///
/// Singleton and in-memory on purpose: it is a cache-busting hint, not a
/// correctness guarantee. Under multiple instances each node revalidates against
/// its own counter, which is still correct — worst case is an extra 200.
/// </summary>
public interface IContentVersion
{
    /// <summary>Opaque token for the current state of published content.</summary>
    string Current { get; }

    /// <summary>Called after any admin write that could change public output.</summary>
    void Bump();
}

public class ContentVersion(ILogger<ContentVersion> logger) : IContentVersion
{
    private long _counter;

    // Distinguishes process lifetimes, so a restart cannot reuse a token that a
    // client is still holding from before a change.
    private readonly string _instance = Guid.NewGuid().ToString("N")[..8];

    public string Current => $"\"{_instance}-{Interlocked.Read(ref _counter)}\"";

    public void Bump()
    {
        var value = Interlocked.Increment(ref _counter);
        logger.LogDebug("Public content version bumped to {Version}.", value);
    }
}
