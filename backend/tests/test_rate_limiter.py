import fakeredis

from app.services.rate_limiter import check_and_consume


def test_allows_calls_up_to_the_limit():
    redis_client = fakeredis.FakeRedis()

    assert check_and_consume(redis_client, "list-am:global", max_per_window=2, window_seconds=60) is True
    assert check_and_consume(redis_client, "list-am:global", max_per_window=2, window_seconds=60) is True


def test_blocks_calls_beyond_the_limit():
    redis_client = fakeredis.FakeRedis()

    check_and_consume(redis_client, "list-am:global", max_per_window=2, window_seconds=60)
    check_and_consume(redis_client, "list-am:global", max_per_window=2, window_seconds=60)

    assert check_and_consume(redis_client, "list-am:global", max_per_window=2, window_seconds=60) is False


def test_different_keys_have_independent_limits():
    redis_client = fakeredis.FakeRedis()

    check_and_consume(redis_client, "list-am:tenant-a", max_per_window=1, window_seconds=60)

    assert check_and_consume(redis_client, "list-am:tenant-b", max_per_window=1, window_seconds=60) is True
